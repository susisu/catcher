import { ResolveFunc, RejectFunc, CancelFunc, triplet, attachActions } from "@susisu/promise-utils";

type Timeout = object | number;
declare function setTimeout(callback: () => void, delay: number): Timeout;
declare function clearTimeout(timeout: unknown): void;

export type Config<T> = Readonly<{
  /**
   * A function that fetches data.
   */
  fetcher: () => Promise<T>;
  /**
   * Optional initial data stored in the cache. If specified, new data will not be fetched until
   * the cache is expired.
   */
  initData?: T | undefined;
  /**
   * Specifies time to live for cache, in milliseconds.
   */
  ttl?: number | undefined;
}>;

type State<T> = ExpiredState | FetchingState<T> | FetchedState<T>;
export type StateType = State<unknown>["type"];

type ExpiredState = Readonly<{
  type: "expired";
}>;

type FetchingState<T> = Readonly<{
  type: "fetching";
  promise: Promise<T>;
  resolve: ResolveFunc<T>;
  reject: RejectFunc;
  cancel: CancelFunc;
}>;

type FetchedState<T> = Readonly<{
  type: "fetched";
  promise: Promise<T>;
  data: T;
}>;

function unreachable(x: never): never {
  throw new Error(`reached: ${JSON.stringify(x)}`);
}

/**
 * Fetcher with cache.
 */
export class Catcher<T> {
  private fetcher: () => Promise<T>;
  private ttl: number | undefined;

  private state: State<T>;
  private ttlTimeout: Timeout | undefined;

  constructor(config: Config<T>) {
    this.fetcher = config.fetcher;
    this.ttl = config.ttl;

    this.state = { type: "expired" };
    this.ttlTimeout = undefined;

    if (config.initData !== undefined) {
      this.setState({
        type: "fetched",
        promise: Promise.resolve(config.initData),
        data: config.initData,
      });
    }
  }

  private setState(state: State<T>): void {
    this.state = state;
    if (this.state.type === "fetched") {
      this.resetTtlTimeout();
    } else {
      this.unsetTtlTimeout();
    }
  }

  private unsetTtlTimeout(): void {
    if (this.ttlTimeout === undefined) {
      return;
    }
    clearTimeout(this.ttlTimeout);
  }

  private resetTtlTimeout(): void {
    this.unsetTtlTimeout();
    if (this.ttl === undefined) {
      return;
    }
    this.ttlTimeout = setTimeout(() => {
      this.expire(false);
    }, this.ttl);
  }

  /**
   * Gets the current state.
   */
  getCurrentState(): StateType {
    return this.state.type;
  }

  /**
   * Gets the already fetched data.
   * If the current state is not "fetched", it throws error.
   */
  unsafeGet(): T {
    if (this.state.type !== "fetched") {
      throw new Error(`Cannot get data: ${this.state.type}`);
    }
    return this.state.data;
  }

  /**
   * Expires the cache or ongoing fetch.
   * @param refetch Specifies whether it should discard ongoing fetch and start a new one.
   *                (default = true)
   */
  expire(refetch: boolean = true): void {
    switch (this.state.type) {
      case "expired":
        // noop
        break;
      case "fetching":
        if (refetch) {
          this.state.cancel.call(undefined);
          const { promise, resolve, reject } = this.state;
          const cancel = this.refetch(resolve, reject);
          this.setState({ type: "fetching", promise, resolve, reject, cancel });
        }
        break;
      case "fetched":
        this.setState({ type: "expired" });
        break;
      default:
        unreachable(this.state);
    }
  }

  /**
   * Fetches data using the given fetcher or returns the cached data.
   */
  fetch(): Promise<T> {
    switch (this.state.type) {
      case "expired": {
        const [promise, resolve, reject] = triplet<T>();
        promise.then(
          data => {
            this.setState({ type: "fetched", promise, data });
          },
          () => {
            this.setState({ type: "expired" });
          }
        );
        const cancel = this.refetch(resolve, reject);
        this.setState({ type: "fetching", promise, resolve, reject, cancel });
        return promise;
      }
      case "fetching":
        return this.state.promise;
      case "fetched":
        return this.state.promise;
      default:
        return unreachable(this.state);
    }
  }

  private refetch(resolve: ResolveFunc<T>, reject: RejectFunc): CancelFunc {
    const [cancel] = attachActions(this.fetcher.call(undefined), resolve, reject);
    return cancel;
  }
}
