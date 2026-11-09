// The model interprets the full instruction. This router only decides what it needs.
export function interpret(instruction, selected = "auto", starting = "") {
  const goal = instruction.trim();
  if (!goal) throw Error("Describe what you want DeskPA to do.");
  const links = [...goal.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m => m[0].replace(/[.,;!?]+$/, "").replace(/\)$/, s => m[0].includes("(") ? s : ""));
  const destinations = [...new Set(links)];
  if (selected === "ask" || (selected === "auto" && !destinations.length && !starting)) {
    return {mode:"ask", goal, url:""};
  }
  if (!starting && destinations.length > 1) throw Error("Choose Browser task and enter the link to open first.");
  let target;
  try { target = new URL(starting || destinations[0]); } catch { throw Error("Add the full https:// link for this browser task."); }
  if (!["http:","https:"].includes(target.protocol) || target.username || target.password) throw Error("Use an HTTP or HTTPS link without embedded credentials.");
  const rest = links.reduce((text, link) => text.replace(link, " "), goal)
    .replace(/[.,!?()[\]:]/g, " ").trim();
  const openOnly = !rest || /^(?:(?:open|launch|visit|go|to|please|this|the|link|page|site|url|ee|aa|ni|chey|cheyi|cheyyi|cheyandi|kholu)\s*)+$/i.test(rest);
  return {goal, url:target.href, mode:openOnly ? "open" : "browse"};
}
