import { vi, describe, test, beforeEach, afterEach, expect } from "vitest";
import { ResolveFunc, RejectFunc, triplet } from "@susisu/promise-utils";
import { Catcher } from "./catcher";

describe("Catcher", () => {
  describe("constructor", () => {
    test("calling without initData initializes the catcher being in expired state", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
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
      const fetcher = vi.fn(() => Promise.resolve(42));
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

  describe("TTL", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    const ttl = 60 * 1000;

    test("it does nothing after TTL in expired state", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
      const catcher = new Catcher({ fetcher, ttl });
      // state: expired
      vi.runAllTimers();
      const fetch = catcher.fetch();
      // state: fetching
      expect(fetcher).toHaveBeenCalledTimes(1);
      const data = await fetch;
      // state: fetched
      expect(data).toBe(42);
    });

    test("it does nothing after TTL in fetching state", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
      const catcher = new Catcher({ fetcher, ttl });
      // state: expired
      const fetch = catcher.fetch();
      // state: fetching
      expect(fetcher).toHaveBeenCalledTimes(1);
      vi.runAllTimers();
      expect(fetcher).toHaveBeenCalledTimes(1);
      const data = await fetch;
      // state: fetched
      expect(data).toBe(42);
    });

    test("it expires cache after TTL in fetched state", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
      const catcher = new Catcher({ fetcher, ttl });
      // state: expired
      const fetch1 = catcher.fetch();
      // state: fetching
      expect(fetcher).toHaveBeenCalledTimes(1);
      await fetch1;
      // state: fetched
      vi.runAllTimers();
      // state: expired
      const fetch2 = catcher.fetch();
      // state: fetching
      expect(fetcher).toHaveBeenCalledTimes(2);
      const data = await fetch2;
      // state: fetched
      expect(data).toBe(42);
    });
  });

  describe("#getCurrentState", () => {
    test("it returns a string that represents the current state", async () => {
      const catcher = new Catcher({ fetcher: () => Promise.resolve(42) });
      // state: expired
      expect(catcher.getCurrentState()).toBe("expired");
      const fetch = catcher.fetch();
      // state: fetching
      expect(catcher.getCurrentState()).toBe("fetching");
      await fetch;
      // state: fetched
      expect(catcher.getCurrentState()).toBe("fetched");
    });
  });

  describe("#unsafeGet", () => {
    test("it returns the already fetched data, or throws error if unavailable", async () => {
      const catcher = new Catcher({ fetcher: () => Promise.resolve(42) });
      // state: expired
      expect(() => catcher.unsafeGet()).toThrow(new Error("Cannot get data: expired"));
      const fetch = catcher.fetch();
      // state: fetching
      expect(() => catcher.unsafeGet()).toThrow(new Error("Cannot get data: fetching"));
      await fetch;
      // state: fetched
      expect(catcher.unsafeGet()).toBe(42);
    });
  });

  describe("#expire", () => {
    test("calling in expired state has no effect", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
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
      const fetcher = vi.fn(() => {
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

    test("calling in fetching state has no effect if refetch = false is specified", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
      const catcher = new Catcher({ fetcher });
      // state: expired
      const fetch = catcher.fetch();
      // state: fetching
      expect(fetcher).toHaveBeenCalledTimes(1);
      catcher.expire(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const data = await fetch;
      // state: fetched
      expect(data).toBe(42);
    });

    test("calling in fetched state discards the last successful fetch", async () => {
      const fetcher = vi.fn(() => Promise.resolve(42));
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
      const fetcher = vi.fn(() => Promise.resolve(42));
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
      const fetcher = vi.fn(() => {
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
      const fetcher = vi.fn(() => {
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
      const fetcher = vi.fn(() => {
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
      const fetcher = vi.fn(() => Promise.resolve(42));
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
