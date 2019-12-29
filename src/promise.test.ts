import { triplet, attachActions } from "./promise";

describe("promise", () => {
  describe("triplet", () => {
    test("resolve function can resolve the promise", async () => {
      const [promise, resolve, reject] = triplet<number>();
      resolve(42);
      await expect(promise).resolves.toBe(42);
      reject(new Error("test")); // no effect
      await expect(promise).resolves.toBe(42);
    });

    test("reject function can reject the promise", async () => {
      const [promise, resolve, reject] = triplet<number>();
      reject(new Error("test"));
      await expect(promise).rejects.toThrowError("test");
      resolve(42); // no effect
      await expect(promise).rejects.toThrowError("test");
    });
  });

  describe("attachActions", () => {
    test("onFulfilled is called when the promise is resolved", async () => {
      const [promise, resolve] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [/* cancel */, actions] = attachActions(promise, onFulfilled, onRejected);
      resolve(42);
      await actions;
      expect(onFulfilled).toHaveBeenCalledWith(42);
      expect(onRejected).not.toHaveBeenCalled();
    });

    test("onRejected is called when the promise is rejected", async () => {
      const [promise, /* resolve */, reject] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [/* cancel */, actions] = attachActions(promise, onFulfilled, onRejected);
      reject(new Error("test"));
      await actions;
      expect(onFulfilled).not.toHaveBeenCalled();
      expect(onRejected).toHaveBeenCalledWith(new Error("test"));
    });

    test("onFulfilled is not called if once cancelled", async () => {
      const [promise, resolve] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [cancel, actions] = attachActions(promise, onFulfilled, onRejected);
      cancel();
      resolve(42);
      await actions;
      expect(onFulfilled).not.toHaveBeenCalled();
      expect(onRejected).not.toHaveBeenCalled();
    });

    test("onRejected is not called if once cancelled", async () => {
      const [promise, /* resolve */, reject] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [cancel, actions] = attachActions(promise, onFulfilled, onRejected);
      cancel();
      reject(new Error("test"));
      await actions;
      expect(onFulfilled).not.toHaveBeenCalled();
      expect(onRejected).not.toHaveBeenCalled();
    });

    test("cancelling after the promise has been fulfilled has no effect", async () => {
      const [promise, resolve] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [cancel, actions] = attachActions(promise, onFulfilled, onRejected);
      resolve(42);
      await actions;
      cancel();
      expect(onFulfilled).toHaveBeenCalledWith(42);
      expect(onRejected).not.toHaveBeenCalled();
    });

    test("cancelling after the promise has been rejected has no effect", async () => {
      const [promise, /* resolve */, reject] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [cancel, actions] = attachActions(promise, onFulfilled, onRejected);
      reject(new Error("test"));
      await actions;
      cancel();
      expect(onFulfilled).not.toHaveBeenCalled();
      expect(onRejected).toHaveBeenCalledWith(new Error("test"));
    });

    test("cancelling twice or more has no effect", async () => {
      const [promise, resolve] = triplet<number>();
      const onFulfilled = jest.fn();
      const onRejected = jest.fn();
      const [cancel, actions] = attachActions(promise, onFulfilled, onRejected);
      cancel();
      cancel();
      resolve(42);
      await actions;
      expect(onFulfilled).not.toHaveBeenCalled();
      expect(onRejected).not.toHaveBeenCalled();
    });
  });
});
