-- Shrink lane bars on the map (height 80 -> 55, y 10 -> 22).
update public.lanes
set layout_y = 22,
    layout_h = 55;
