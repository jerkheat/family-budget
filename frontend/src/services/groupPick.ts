export function pickGroup(list: any[]) {
  if (!list || !list.length) return null;
  const stored = parseInt(localStorage.getItem("fb_active_group") || "0", 10);
  const g = list.find(x => x.id === stored) || list[0];
  localStorage.setItem("fb_active_group", String(g.id));
  return g;
}
