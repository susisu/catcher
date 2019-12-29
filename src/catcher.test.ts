import { Catcher } from "./catcher";
import { ResolveFunc, RejectFunc, triplet } from "./promise";

describe("catcher", () => {
  describe("Catcher", () => {
    describe("constructor", () => {
      test("calling without initData initializes the catcher being in expired state", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const data = await fetch;
        // state: fetched
        expect(data).toBe(42);
      });

      test("calling with initData initializes the catcher being in fetched state", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher, initData: 0 });
        // state: fetched
        const fetch1 = catcher.fetch();
        expect(fetcher).toHaveBeenCalledTimes(0);
        const data1 = await fetch1;
        expect(data1).toBe(0);
        catcher.expire();
        // state: expired
        const fetch2 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const data2 = await fetch2;
        // state: fetched
        expect(data2).toBe(42);
      });
    });

    describe("#expire", () => {
      test("calling in expired state has no effect", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher });
        // state: expired
        catcher.expire();
        const fetch = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const data = await fetch;
        // state: fetched
        expect(data).toBe(42);
      });

      test("calling in fetching state cancels the ongoing fetch and starts a new one", async () => {
        let resolve: ResolveFunc<number> = () => {};
        let reject: RejectFunc = () => {};
        const fetcher = jest.fn(() => {
          const [promise, resolve_, reject_] = triplet<number>();
          resolve = resolve_;
          reject = reject_;
          return promise;
        });
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const resolve1 = resolve;
        catcher.expire();
        expect(fetcher).toHaveBeenCalledTimes(2);
        resolve1(42);
        const reject2 = reject;
        catcher.expire();
        expect(fetcher).toHaveBeenCalledTimes(3);
        reject2(new Error("test"));
        resolve(43);
        const data = await fetch;
        // state: fetched
        expect(data).toBe(43);
      });

      test("calling in fetched state discards the last successful fetch", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch1 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        await fetch1;
        // state: fetched
        catcher.expire();
        // state: expired
        const fetch2 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(2);
        const data = await fetch2;
        // state: fetched
        expect(data).toBe(42);
      });
    });

    describe("#fetch", () => {
      test("calling in expired state starts a new fetch", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const data = await fetch;
        // state: fetched
        expect(data).toBe(42);
      });

      test("promise is rejected if fetching failed", async () => {
        let resolve: ResolveFunc<number> = () => {};
        let reject: RejectFunc = () => {};
        const fetcher = jest.fn(() => {
          const [promise, resolve_, reject_] = triplet<number>();
          resolve = resolve_;
          reject = reject_;
          return promise;
        });
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch1 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        reject(new Error("test"));
        await expect(fetch1).rejects.toThrowError("test");
        // state: expired
        const fetch2 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(2);
        resolve(42);
        const data = await fetch2;
        // state: fetched
        expect(data).toBe(42);
      });

      test("calling in fetching state reuses the ongoing fetch", async () => {
        let resolve: ResolveFunc<number> = () => {};
        const fetcher = jest.fn(() => {
          const [promise, resolve_] = triplet<number>();
          resolve = resolve_;
          return promise;
        });
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch1 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const fetch2 = catcher.fetch();
        expect(fetcher).toHaveBeenCalledTimes(1);
        resolve(42);
        await fetch1;
        const data = await fetch2;
        // state: fetched
        expect(data).toBe(42);
      });

      test("all promises are rejected if fetching failed", async () => {
        let resolve: ResolveFunc<number> = () => {};
        let reject: RejectFunc = () => {};
        const fetcher = jest.fn(() => {
          const [promise, resolve_, reject_] = triplet<number>();
          resolve = resolve_;
          reject = reject_;
          return promise;
        });
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch1 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        const fetch2 = catcher.fetch();
        expect(fetcher).toHaveBeenCalledTimes(1);
        reject(new Error("test"));
        await expect(fetch1).rejects.toThrowError("test");
        await expect(fetch2).rejects.toThrowError("test");
        // state: expired
        const fetch3 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(2);
        resolve(42);
        const data = await fetch3;
        // state: fetched
        expect(data).toBe(42);
      });

      test("calling in fetched state reuses the last successful fetch", async () => {
        const fetcher = jest.fn(() => Promise.resolve(42));
        const catcher = new Catcher({ fetcher });
        // state: expired
        const fetch1 = catcher.fetch();
        // state: fetching
        expect(fetcher).toHaveBeenCalledTimes(1);
        await fetch1;
        // state: fetched
        const fetch2 = catcher.fetch();
        expect(fetcher).toHaveBeenCalledTimes(1);
        const data = await fetch2;
        expect(data).toBe(42);
      });
    });
  });
});
