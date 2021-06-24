'use strict'

type Config = {
  MAX_FRAMES: number,
  MAX_PINS: number
}

enum FrameStatus {
  'NORMAL',
  'SPARE',
  'STRIKE'
}

class Frame {

  rounds!: number[];
  status?: FrameStatus;
  score?: number;
  self_score_calculated?: boolean;

  setFrameStatusByScore(rounds: number[]) {
    this.self_score_calculated = false;
    if (rounds[0] === 10) {
      this.status = FrameStatus.STRIKE;
    } else if (rounds[1] && (rounds[0] + rounds[1]) === 10) {
      this.status = FrameStatus.SPARE;
    } else {
      this.status = FrameStatus.NORMAL;
    }
  }

  constructor(rounds: number[], status?: FrameStatus, self_score_calculated?: boolean) {
    this.self_score_calculated = self_score_calculated;
    this.rounds = rounds;
    if (status) {
      this.status = status;
    } else {
      this.setFrameStatusByScore(rounds)
    }
  }
}

class DashboardInput {
  frames!: Frame[];
  config!: Config;



  constructor(arr: number[][], local_config: Config) {
    this.config = local_config;
    this.frames = [];
    //  this.count_extra_rounds(arr, this.config.MAX_FRAMES);
    const res_is_game_over = DashboardInput.is_game_over(arr, this.config.MAX_FRAMES);

    arr && arr.forEach(
      (item) => { this.frames.push(new Frame(item)) }
    );
  }

  public static is_game_over(arr: number[][], max_arr: number):[] {

    let frameStatus;

    if (arr.length - max_arr >= 0) {
      frameStatus = new Frame(arr[arr.length - 1]).status;
      if (frameStatus === FrameStatus.NORMAL) {
        return [true, null]
      }


      //there are more arr than max
      const res: number | undefined = DashboardInput.count_extra_rounds(arr, max_arr);

      if (FrameStatus.SPARE && res === 1)//HAVE 1 MORE SHOT
        return [true,null];
      else if (FrameStatus.SPARE && res >= 2)//HAVE 1 MORE SHOT
        [null, new Error(`maximum 1 extra rounds for spare on the last frame`)];

      if (FrameStatus.STRIKE && res === 2)//HAVE 1 OR 2 MORE SHOT
        return [true, null];
      else if (FrameStatus.STRIKE && res > 2)//HAVE 1 MORE SHOT
        return [null, new Error(`maximum 2 extra rounds for strike on the last frame`)];
      // if (res && res > 2) {
      //   throw new Error(`maximum 3 rounds on last frame`)

      // }

    }
    return [false, null];
  }

  static count_extra_rounds(arr: number[][], limit: number): number {
    const arr_sliced = arr.slice(limit + 1, arr.length);
    return arr_sliced.reduce((accumulator, currentArr) => {
      accumulator += (currentArr.length);

      return accumulator;
    }, 0);
  }

  next_round_score(current_index: number): number | undefined {
    return (this.frames[current_index + 1] && this.frames[current_index + 1].rounds[0]) ? this.frames[current_index + 1].rounds[0] : undefined;
  }

  next_2_rounds_score(current_index: number): number | undefined {
    if (this.frames[current_index + 1].status === FrameStatus.STRIKE) {
      const res = this.next_round_score(current_index + 1);//practicly get the score of the frame at the current_current_index+2
      return res ? res : undefined;
    } else {
      return (this.frames[current_index + 1] && this.frames[current_index + 1].rounds[1]) ? this.frames[current_index + 1].rounds[1] : undefined;
    }
  }

  isValidFrame(userInput: { frameIndex: number; rounds: number[]; }, dashboardInput: DashboardInput) {
    const dashboardLastIndex = dashboardInput.frames.length;
    if (userInput.rounds.length === 0 || userInput.rounds.length > 2) {
      return [null, new Error('error: invalid number of rounds')];
    }

    if (dashboardLastIndex !== userInput.frameIndex) {
      return [null, new Error('error: invalid frameIndex')];
    }

    if (userInput.frameIndex >= this.config.MAX_FRAMES + 2) {
      //organic frame: the index equal to the max frame which determined in the configuration.
      return [null, new Error('error: no more than 3 rounds can be played on the last organic frame')];
    }
    return [true, null]
  }

  getUpdatedDashboard(userInput: { frameIndex: number; rounds: number[]; }, dashboardInput: DashboardInput) {
    return new Promise((resolve, reject) => {
      let data, err;
      [data, err] = this.isValidFrame(userInput, dashboardInput);
      if (err) {
        reject(err)
      }
      if (data === true) {
        dashboardInput.frames.push(new Frame(userInput.rounds));
        resolve(dashboardInput);
      }
    });
  }

  calculateScore() {
    const MAX_FRAMES = this.frames.length;
    let score_next_round: number | undefined;
    let score_next_2_rounds: number | undefined;
    this.frames.map((frame, index) => {
      if (index < this.config.MAX_FRAMES) {
        switch (frame.status) {
          case FrameStatus.NORMAL:
            frame.score = frame.rounds[0] + frame.rounds[1];
            frame.self_score_calculated = true;
            break;
          case FrameStatus.SPARE:
            frame.score = 10;
            score_next_round = this.next_round_score(index);
            frame.self_score_calculated = false;
            if (score_next_round) {
              frame.score += score_next_round;
              frame.self_score_calculated = true;
            }
            break;
          case FrameStatus.STRIKE:
            frame.score = 10;
            score_next_round = this.next_round_score(index);
            frame.self_score_calculated = false;

            if (score_next_round) {
              frame.score += score_next_round!;
              score_next_2_rounds = this.next_2_rounds_score(index);
              //console.info({ score_next_2_rounds })
              if (score_next_2_rounds) {
                frame.score += score_next_2_rounds!; frame.self_score_calculated = true;
              }

            }
            break;
          default:
            break;
            return frame;

        }
      } else {
        //extra 1 or 2 frames has no self-score
      }
    }) //frames.map
    return this.frames;
  }//calculate




}





describe("test game rules", () => {
  let my_config: Config;

  beforeAll(() => {
    my_config = {
      MAX_FRAMES: 2,
      MAX_PINS: 10
    }
  });

  describe("dashboard class", () => {
    describe("extending the dashboard with invalid frame produces an Error", () => {

      test("frameIndex not in sync with the dashboard's latest frame position", async () => {
        const userInput = { frameIndex: 3, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const expectedResult = 'frameIndex';
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });

      test("frame with no rounds", async () => {
        const userInput = { frameIndex: 3, rounds: [] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const expectedResult = 'number of rounds';
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });

      test("frame with more than 2 rounds", async () => {
        const userInput = { frameIndex: 3, rounds: [1, 2, 3] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const expectedResult = 'number of rounds';
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });
      test.skip("round should be a native number", async () => {

      });
      test.skip("sum of 2 rounds is below the max-pin configured value", async () => {

      });
      test.skip("in case of strike - the 2nd round is not set", async () => {

      });
    });

    describe("dashboard is extended by adding a valid frame", () => {
      test("user adds a non-bonus frame", async () => {
        const dashboard: DashboardInput = new DashboardInput([], my_config);

        const userInput = { frameIndex: 0, rounds: [1, 2] };
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard);
        const expectedResult = { "config": my_config, "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] };

        expect(dashboardUpdated).toEqual(expectedResult);
      });

      test("user adds 2 non-bonus frames", async () => {
        const dashboard: DashboardInput = new DashboardInput([[1, 2]], my_config);
        const userInput = { frameIndex: 1, rounds: [1, 2] };
        const expectedResult = { "config": my_config, "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }, { "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] }
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard);
        expect((dashboardUpdated)).toEqual(expectedResult);
      });

    });


    describe("calculate score", () => {

      test("test normal frames (their sum is less than 10)", async () => {
        const userInput = { frameIndex: 2, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const dashboard_calculateScore = dashboard.calculateScore();
        const expectedResult =
          [{ "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": 0 }, { "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": 0 }];
        expect(dashboard_calculateScore).toEqual(expectedResult);
      });

      test("frame has Spare", async () => {
        const userInput = { frameIndex: 2, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard);

        const expectedResult = new DashboardInput([[1, 2], [1, 2], [5, 5]], my_config);
        expect(JSON.stringify(dashboardUpdated)).toEqual(JSON.stringify(expectedResult));
      });

      test("frames has Strike", async () => {
        const userInput = { frameIndex: 2, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[10], [10], [10], [10]], my_config);
        const dashboard_calculateScore = dashboard.calculateScore();
        const expectedResult = [{ "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }];
        expect(dashboard_calculateScore).toEqual(expectedResult);
      });
    });



    describe("a game is over", () => {
      describe("invalid status of dashboard", () => {
        test("setting a dashboard with invalid number of rounds", async () => {
          const [res_is_game_over, err] = DashboardInput.is_game_over([[10], [10], [10], [10], [8, 1]], my_config.MAX_FRAMES);
          expect(err).toEqual(null);

          expect(res_is_game_over).toEqual(11);

          //dashboard.check_game_over();
        });
      });
    });

    // no more than three balls can be rolled in tenth frame

  });
});
