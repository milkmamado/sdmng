// 기본 1000행 제한을 넘어 전체 행을 가져오는 헬퍼.
// 호출부는 정렬 안정성을 위해 order(...)에 id 보조 정렬을 추가할 것.
const PAGE_SIZE = 1000;

export async function fetchAllRows<T = any>(
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<{ data: T[] | null; error: any }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    if (data) all.push(...data);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: all, error: null };
}
