(function () {
  let supabaseConfigPromise = null;

  function getLocalStorageApi() {
    if (!window.LinkBoardStorage) {
      throw new Error("LinkBoardStorage must be loaded before LinkBoardSupabase.");
    }
    return window.LinkBoardStorage;
  }

  async function getSupabaseConfig() {
    if (!supabaseConfigPromise) {
      supabaseConfigPromise = import("./supabaseClient.js");
    }
    return supabaseConfigPromise;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function generateUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  function getClientId(row) {
    if (!row || typeof row !== "object") return "";
    return String(row.client_id || row.id || "");
  }

  function normalizeState(state) {
    const storageApi = getLocalStorageApi();
    return storageApi.migrateState(state);
  }

  function buildState(columnsRows, cardsRows) {
    const columns = [];
    const columnByDatabaseId = new Map();

    columnsRows.forEach((columnRow) => {
      const column = {
        id: getClientId(columnRow),
        title: columnRow.title || "Untitled",
        cards: [],
      };
      columns.push(column);
      columnByDatabaseId.set(String(columnRow.id), column);
    });

    cardsRows.forEach((cardRow) => {
      const column = columnByDatabaseId.get(String(cardRow.column_id));
      if (!column) return;

      column.cards.push({
        id: getClientId(cardRow),
        url: cardRow.url || "",
        title: cardRow.title || "",
        note: cardRow.note || "",
      });
    });

    return normalizeState({ columns: columns });
  }

  async function loadState() {
    try {
      const { supabase, DEV_BOARD_ID } = await getSupabaseConfig();

      const [boardResult, columnsResult, cardsResult] = await Promise.all([
        supabase
          .from("boards")
          .select("id")
          .eq("id", DEV_BOARD_ID)
          .maybeSingle(),
        supabase
          .from("columns")
          .select("id, client_id, title, position")
          .eq("board_id", DEV_BOARD_ID)
          .order("position", { ascending: true }),
        supabase
          .from("cards")
          .select("id, client_id, board_id, column_id, title, url, note, position")
          .eq("board_id", DEV_BOARD_ID)
          .order("position", { ascending: true }),
      ]);

      if (boardResult.error) throw boardResult.error;
      if (columnsResult.error) throw columnsResult.error;
      if (cardsResult.error) throw cardsResult.error;

      const columns = columnsResult.data || [];
      const cards = cardsResult.data || [];

      if (!boardResult.data && columns.length === 0 && cards.length === 0) {
        return { status: "empty", state: null };
      }

      if (columns.length === 0 && cards.length === 0) {
        return { status: "empty", state: null };
      }

      return {
        status: "ok",
        state: buildState(columns, cards),
      };
    } catch (error) {
      return {
        status: "unavailable",
        state: null,
        error: error,
      };
    }
  }

  async function saveState(state) {
    const normalizedState = normalizeState(state);
    const { supabase, DEV_OWNER_ID, DEV_BOARD_ID } = await getSupabaseConfig();

    const [existingColumnsResult, existingCardsResult] = await Promise.all([
      supabase
        .from("columns")
        .select("id, client_id")
        .eq("board_id", DEV_BOARD_ID),
      supabase
        .from("cards")
        .select("id, client_id")
        .eq("board_id", DEV_BOARD_ID),
    ]);

    if (existingColumnsResult.error) throw existingColumnsResult.error;
    if (existingCardsResult.error) throw existingCardsResult.error;

    const existingColumns = existingColumnsResult.data || [];
    const existingCards = existingCardsResult.data || [];

    const columnIdByClientId = new Map();
    existingColumns.forEach((row) => {
      columnIdByClientId.set(getClientId(row), String(row.id));
    });

    const cardIdByClientId = new Map();
    existingCards.forEach((row) => {
      cardIdByClientId.set(getClientId(row), String(row.id));
    });

    const columnRows = normalizedState.columns.map((column, index) => {
      const clientId = String(column.id);
      const existingId = columnIdByClientId.get(clientId);
      const databaseId = existingId || (isUuid(clientId) ? clientId : generateUuid());
      columnIdByClientId.set(clientId, databaseId);

      return {
        id: databaseId,
        client_id: clientId,
        owner_id: DEV_OWNER_ID,
        board_id: DEV_BOARD_ID,
        title: (column.title || "").trim() || "Untitled",
        position: index,
      };
    });

    const cardRows = [];
    normalizedState.columns.forEach((column) => {
      const databaseColumnId = columnIdByClientId.get(String(column.id));
      (column.cards || []).forEach((card, index) => {
        const clientId = String(card.id);
        const existingId = cardIdByClientId.get(clientId);
        const databaseId = existingId || (isUuid(clientId) ? clientId : generateUuid());
        cardIdByClientId.set(clientId, databaseId);

        cardRows.push({
          id: databaseId,
          client_id: clientId,
          owner_id: DEV_OWNER_ID,
          board_id: DEV_BOARD_ID,
          column_id: databaseColumnId,
          title: (card.title || "").trim() || null,
          url: String(card.url || ""),
          note: (card.note || "").trim() || null,
          position: index,
        });
      });
    });

    const boardRow = {
      id: DEV_BOARD_ID,
      owner_id: DEV_OWNER_ID,
      name: "My LinkBoard",
    };

    const currentColumnDatabaseIds = new Set(columnRows.map((row) => String(row.id)));
    const currentCardDatabaseIds = new Set(cardRows.map((row) => String(row.id)));

    const deletedCardIds = existingCards
      .map((row) => String(row.id))
      .filter((id) => !currentCardDatabaseIds.has(id));
    const deletedColumnIds = existingColumns
      .map((row) => String(row.id))
      .filter((id) => !currentColumnDatabaseIds.has(id));

    const upsertBoardResult = await supabase.from("boards").upsert(boardRow, {
      onConflict: "id",
    });
    if (upsertBoardResult.error) throw upsertBoardResult.error;

    if (columnRows.length > 0) {
      const upsertColumnsResult = await supabase.from("columns").upsert(columnRows, {
        onConflict: "id",
      });
      if (upsertColumnsResult.error) throw upsertColumnsResult.error;
    }

    if (cardRows.length > 0) {
      const upsertCardsResult = await supabase.from("cards").upsert(cardRows, {
        onConflict: "id",
      });
      if (upsertCardsResult.error) throw upsertCardsResult.error;
    }

    if (deletedCardIds.length > 0) {
      const deleteCardsResult = await supabase
        .from("cards")
        .delete()
        .in("id", deletedCardIds);
      if (deleteCardsResult.error) throw deleteCardsResult.error;
    }

    if (deletedColumnIds.length > 0) {
      const deleteColumnsResult = await supabase
        .from("columns")
        .delete()
        .in("id", deletedColumnIds);
      if (deleteColumnsResult.error) throw deleteColumnsResult.error;
    }

    return { ok: true };
  }

  window.LinkBoardSupabase = {
    loadState: loadState,
    saveState: saveState,
  };
})();
