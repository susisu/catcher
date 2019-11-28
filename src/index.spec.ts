import { Catcher } from ".";

describe("Catcher", () => {
  it("should fetch data", async () => {
    const fetcher = jest.fn(() => Promise.resolve(42));
    const catcher = new Catcher({
      fetcher,
      initData: 0,
    });
    const data = await catcher.fetch();
    expect(data).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should cache data", async () => {
    const fetcher = jest.fn(() => Promise.resolve(42));
    const catcher = new Catcher({
      fetcher,
      initData: 0,
    });
    const data1 = await catcher.fetch();
    expect(data1).toBe(42);
    const data2 = await catcher.fetch();
    expect(data2).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should not fetch data if the initial data is fresh", async () => {
    const fetcher = jest.fn(() => Promise.resolve(42));
    const catcher = new Catcher({
      fetcher,
      initData: 0,
      fresh   : true,
    });
    const data = await catcher.fetch();
    expect(data).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(0);
  });

  it("should be expire the cache", async () => {
    const fetcher = jest.fn(() => Promise.resolve(42));
    const catcher = new Catcher({
      fetcher,
      initData: 0,
      fresh   : true,
    });
    const data1 = await catcher.fetch();
    expect(data1).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(0);
    catcher.expire();
    const data2 = await catcher.fetch();
    expect(data2).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should not fetch if another fetch is ongoing", async () => {
    let resolve: (data: number) => void = () => {};
    const promise = new Promise<number>(_resolve => {
      resolve = _resolve;
    });
    const fetcher = jest.fn(() => promise);
    const catcher = new Catcher({
      fetcher,
      initData: 0,
    });
    const fetch1 = catcher.fetch();
    const fetch2 = catcher.fetch();
    resolve(42);
    const data1 = await fetch1;
    expect(data1).toBe(42);
    const data2 = await fetch2;
    expect(data2).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should ignore fetch errors and not update cache", async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error("error")));
    const catcher = new Catcher({
      fetcher,
      initData: 0,
    });
    const data1 = await catcher.fetch();
    expect(data1).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const data2 = await catcher.fetch();
    expect(data2).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
