import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://pcwighpffrqvvqlxcpru.supabase.co";
export const SUPABASE_KEY = "sb_publishable_9qvYVR9ElVK9p28eAC8vOg_FA5S7fTW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DEV_OWNER_ID = "00000000-0000-0000-0000-000000000001";
export const DEV_BOARD_ID = "00000000-0000-0000-0000-000000000101";