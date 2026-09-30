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

/**
 * 이미 필터·정렬이 적용된 조회 빌더를 그대로 받아 전체 행을 페이지네이션으로 가져온다.
 * 기존 정렬 뒤에 id 보조 정렬을 한 번 추가하고, range 만 바꿔 가며 같은 조건으로 재조회한다.
 * (필터 체인은 호출부에서 기존과 동일하게 구성)
 */
export async function fetchAllQuery<T = any>(
  query: any,
): Promise<{ data: T[] | null; error: any }> {
  const q = query.order('id', { ascending: true });
  return fetchAllRows<T>((from, to) => q.range(from, to));
}

/**
 * 큰 id 목록을 100개씩 나눠 조회 후 결과를 합친다 (URL 길이 초과 방지).
 * makeQuery 는 chunk 를 받아 { data, error } 를 반환.
 */
export async function fetchInChunks<T = any, K = string>(
  ids: K[],
  makeQuery: (chunk: K[]) => PromiseLike<{ data: T[] | null; error: any }>,
  size = 100,
): Promise<{ data: T[] | null; error: any }> {
  if (ids.length <= size) return makeQuery(ids);
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const { data, error } = await makeQuery(ids.slice(i, i + size));
    if (error) return { data: null, error };
    if (data) all.push(...data);
  }
  return { data: all, error: null };
}
