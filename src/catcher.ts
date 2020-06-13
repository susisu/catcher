import { ResolveFunc, RejectFunc, CancelFunc, triplet, attachActions } from "@susisu/promise-utils";

type Config<T> = Readonly<{
  /**
   * A function that fetches data.
   */
  fetcher: () => Promise<T>;
  /**
   * Optional initial data stored in the cache. If specified, new data will not be fetched until
   * the cache is expired.
   */
  initData?: T;
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

/**
 * Fetcher with cache.
 */
export class Catcher<T> {
  private fetcher: () => Promise<T>;

  private state: State<T>;

  constructor(config: Config<T>) {
    this.fetcher = config.fetcher;

    if (config.initData === undefined) {
      this.state = { type: "expired" };
    } else {
      this.state = {
        type: "fetched",
        promise: Promise.resolve(config.initData),
        data: config.initData,
      };
    }
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
   */
  expire(): void {
    switch (this.state.type) {
      case "expired":
        // noop
        break;
      case "fetching": {
        this.state.cancel.call(undefined);
        const { promise, resolve, reject } = this.state;
        const cancel = this.refetch(resolve, reject);
        this.state = { type: "fetching", promise, resolve, reject, cancel };
        break;
      }
      case "fetched":
        this.state = { type: "expired" };
        break;
      default:
        // never
        throw new Error("invalid state");
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
            this.state = { type: "fetched", promise, data };
          },
          () => {
            this.state = { type: "expired" };
          }
        );
        const cancel = this.refetch(resolve, reject);
        this.state = { type: "fetching", promise, resolve, reject, cancel };
        return promise;
      }
      case "fetching":
        return this.state.promise;
      case "fetched":
        return this.state.promise;
      default:
        // never
        throw new Error("invalid state");
    }
  }

  private refetch(resolve: ResolveFunc<T>, reject: RejectFunc): CancelFunc {
    const [cancel] = attachActions(this.fetcher.call(undefined), resolve, reject);
    return cancel;
  }
}
