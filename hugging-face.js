export async function fetchDailyPapers(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const url = `https://huggingface.co/api/daily_papers?date=${year}-${month}-${day}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch papers: ${response.statusText}`);
  }

  const items = await response.json();
  return items
    .filter((item) => item.paper)
    .map((item) => ({
      ...item,
      paperUrl: `https://huggingface.co/papers/${item.paper.id}`,
    }));
}
