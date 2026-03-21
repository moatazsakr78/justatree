INSERT INTO elfaroukgroup.store_theme_colors
  (name, primary_color, primary_hover_color, interactive_color, button_color, button_hover_color, is_active, is_default)
VALUES
  ('وردي أنيق', '#6D1D4A', '#551538', '#E84393', '#6D1D4A', '#551538', false, false)
ON CONFLICT (name) DO NOTHING;
