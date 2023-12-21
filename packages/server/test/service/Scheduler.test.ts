import { Scheduler } from "../../src/modules/scheduler/Scheduler";

import * as assert from "assert";

class TestScheduler extends Scheduler {
    public init_value: number = 0;
    public value: number = 0;
    public events: string[] = [];

    public setOption(options: any) {
        if (options && options.value !== undefined) this.init_value = options.value;
    }

    protected override async work() {
        this.task?.emit("event1", { value: this.value });
        this.value = this.init_value + 1;
        this.task?.emit("event2", { value: this.value });
    }

    protected addEventHandlers() {
        this.task?.on("event1", this.onEvent1.bind(this));
        this.task?.on("event2", this.onEvent2.bind(this));
    }

    protected removeEventHandlers() {
        this.task?.off("event1", this.onEvent1.bind(this));
        this.task?.off("event2", this.onEvent2.bind(this));
    }

    private onEvent1(param: any) {
        this.events.push("event1");
    }

    private onEvent2(param: any) {
        this.events.push("event2");
    }
}

describe("Test of Scheduler", () => {
    let scheduler: TestScheduler;

    before("Create Scheduler", () => {
        scheduler = new TestScheduler("*/2 * * * * *");
        scheduler.setOption({ value: 10 });
    });

    it("Start Scheduler", () => {
        scheduler.start();
        assert.ok(scheduler.isRunning());
    });

    it("Check value", async () => {
        await assert.doesNotReject(
            new Promise<void>((resolve, reject) =>
                setTimeout(async () => {
                    try {
                        if (scheduler.value === 11) resolve();
                        else reject();
                    } catch (err) {
                        reject(err);
                    }
                }, 5 * 1000)
            )
        );
        assert.deepStrictEqual(scheduler.events[0], "event1");
        assert.deepStrictEqual(scheduler.events[1], "event2");
    });

    it("Stop Scheduler", async () => {
        scheduler.stop();
        await scheduler.waitForStop();
        assert.ok(!scheduler.isRunning());
    });

    it("Second Start Scheduler", () => {
        scheduler.start();
        assert.ok(scheduler.isRunning());
    });

    it("Second Stop Scheduler", async () => {
        scheduler.stop();
        await scheduler.waitForStop();
        assert.ok(!scheduler.isRunning());
    });
});
