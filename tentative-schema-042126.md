### `profiles`

- `id`
- `email`
- `plan`
- `stripe_customer_id`
- `created_at`
- `updated_at`

### `boards`

- `id`
- `owner_id`
- `name`
- maybe `is_public`
- `created_at`
- `updated_at`

### `columns`

- `id`
- `board_id`
- `owner_id`
- `title`
- `position`
- `created_at`
- `updated_at`

### `cards`

- `id`
- `column_id`
- `owner_id`
- `title`
- `url`
- `note`
- `position`
- `created_at`
- `updated_at`
