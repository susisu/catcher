type Fetcher<T> = () => Promise<T>;

type Config<T> = Readonly<{
  /**
   * A function that fetches data.
   */
  fetcher: Fetcher<T>,
  /**
   * Initial data stored in cache.
   */
  initData: T,
  /**
   * Specifies wheter the initial data is a fresh one i.e. it is synced with the source and does not
   * need to be re-fetched until it is expired.
   */
  fresh?: boolean,
}>;

/**
 * Catcher is a fetcher with cache.
 */
export class Catcher<T> {
  private fetcher: Fetcher<T>;
  private cache: T;
  private expired: boolean;

  private pendingRefresh: Promise<void> | undefined;

  constructor(config: Config<T>) {
    this.fetcher = config.fetcher;
    this.cache = config.initData;
    this.expired = typeof config.fresh === "boolean" ? !config.fresh : true;

    this.pendingRefresh = undefined;
  }

  /**
   * Refreshes the cache if it is expired.
   */
  private refresh(): Promise<void> {
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }
    if (!this.expired) {
      return Promise.resolve();
    }
    const promise = this.fetcher.call(undefined).then(
      data => {
        this.cache = data;
        this.expired = false;
        this.pendingRefresh = undefined;
      },
      () => {
        this.pendingRefresh = undefined;
      }
    );
    this.pendingRefresh = promise;
    return promise;
  }

  /**
   * Fetches data using the fetcher, or returns the cached one.
   * It invokes the fetcher only when the cache is expired.
   */
  async fetch(): Promise<T> {
    await this.refresh();
    return this.cache;
  }

  /**
   * Expires the cache.
   */
  expire(): void {
    this.expired = true;
  }
}
