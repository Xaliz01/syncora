import {
  defaultListenPort,
  httpControllers,
  planwiseProcess,
  processServiceName,
  runsHttp,
  runsMigrations,
  runsNotificationCrons,
  runsWorkerCrons,
  whenWorkerCrons,
} from "../process-role";

describe("planwise process role", () => {
  const previous = process.env.PLANWISE_PROCESS;

  afterEach(() => {
    if (previous === undefined) delete process.env.PLANWISE_PROCESS;
    else process.env.PLANWISE_PROCESS = previous;
  });

  it("defaults to a single process with HTTP and both cron groups", () => {
    delete process.env.PLANWISE_PROCESS;
    expect(planwiseProcess()).toBe("all");
    expect(runsHttp()).toBe(true);
    expect(runsWorkerCrons()).toBe(true);
    expect(runsNotificationCrons()).toBe(true);
    expect(runsMigrations()).toBe(true);
    expect(defaultListenPort()).toBe(3000);
    expect(processServiceName()).toBe("api-gateway");
    expect(httpControllers(["route"])).toEqual(["route"]);
    expect(whenWorkerCrons(["cron"])).toEqual(["cron"]);
  });

  it("keeps HTTP on the API process and moves crons out", () => {
    process.env.PLANWISE_PROCESS = "api";
    expect(runsHttp()).toBe(true);
    expect(runsWorkerCrons()).toBe(false);
    expect(runsNotificationCrons()).toBe(false);
    expect(runsMigrations()).toBe(true);
    expect(httpControllers(["route"])).toEqual(["route"]);
    expect(whenWorkerCrons(["cron"])).toEqual([]);
  });

  it("runs worker crons without HTTP routes", () => {
    process.env.PLANWISE_PROCESS = "worker";
    expect(runsHttp()).toBe(false);
    expect(runsWorkerCrons()).toBe(true);
    expect(runsNotificationCrons()).toBe(false);
    expect(defaultListenPort()).toBe(3020);
    expect(processServiceName()).toBe("planwise-worker");
    expect(httpControllers(["route"])).toEqual([]);
  });

  it("runs notification crons without migrations", () => {
    process.env.PLANWISE_PROCESS = "notifications";
    expect(runsHttp()).toBe(false);
    expect(runsNotificationCrons()).toBe(true);
    expect(runsWorkerCrons()).toBe(false);
    expect(runsMigrations()).toBe(false);
    expect(defaultListenPort()).toBe(3010);
    expect(processServiceName()).toBe("planwise-notifications");
  });
});
