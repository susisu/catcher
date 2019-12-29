export type ResolveFunc<T> = (data: T) => void;
export type RejectFunc = (err: unknown) => void;
type PromiseTriplet<T> = [Promise<T>, ResolveFunc<T>, RejectFunc];

const noop = (): void => {};

/**
 * Creates a triplet of a promise and its resolve and reject functions.
 */
export function triplet<T>(): PromiseTriplet<T> {
  let resolve: ResolveFunc<T> = noop;
  let reject: RejectFunc = noop;
  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });
  return [promise, resolve, reject];
}

type OnFulfilledFunc<T> = (data: T) => void;
type OnRejectedFunc = (err: unknown) => void;
export type CancelFunc = () => void;

/**
 * Attaches cancellable actions to a promise.
 */
export function attachActions<T>(
  promise: Promise<T>, onFulfilled: OnFulfilledFunc<T>, onRejected: OnRejectedFunc
): [CancelFunc, Promise<void>] {
  let resolved = false;
  let cancelled = false;
  const cancel: CancelFunc = () => {
    if (!resolved && !cancelled) {
      cancelled = true;
    }
  };
  const actions = promise.then(
    data => {
      if (!cancelled) {
        resolved = true;
        onFulfilled(data);
      }
    },
    err => {
      if (!cancelled) {
        resolved = true;
        onRejected(err);
      }
    }
  );
  return [cancel, actions];
}
