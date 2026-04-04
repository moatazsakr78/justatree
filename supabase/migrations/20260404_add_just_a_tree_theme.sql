-- Add "Just A Tree" layout theme
INSERT INTO elfaroukgroup.website_themes
  (theme_id, name, description, thumbnail_url, is_active, settings)
VALUES
  ('just-a-tree', 'مجرد شجرة', 'تصميم مستوحى من الطبيعة - أجواء نباتية فاخرة لمتاجر الأشجار والنباتات الزينة', '/themes/just-a-tree/thumbnail.png', false, '{}');

-- Add botanical green color theme
INSERT INTO elfaroukgroup.store_theme_colors
  (name, primary_color, primary_hover_color, interactive_color, button_color, button_hover_color, is_active, is_default)
VALUES
  ('أخضر نباتي', '#2D5A3D', '#1E3F2B', '#4A9D6E', '#2D5A3D', '#1E3F2B', false, false);
