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

class Utils {
  static count_extra_rounds(arr: number[][], limit: number): number {
    const arr_sliced = arr.slice(limit, arr.length);
    return arr_sliced.reduce((accumulator, currentArr) => {
      accumulator += (currentArr.length);

      return accumulator;
    }, 0);
  }
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
  
  static createFrame(userInput, config){
    const [is_valid,err] = Frame.isValidFrame(userInput, config)
    if(is_valid){
      return new Frame(userInput.rounds);
    } else {
      throw(err);
    }
  }

  static isValidFrame(userInput: { frameIndex: number; rounds: number[]; }, config: Config): [boolean | null, Error | null] {

    if (userInput.rounds.length === 0 || userInput.rounds.length > 2) {
      return [null, new Error('error: invalid number of rounds')];
    }



    if (userInput.frameIndex >= config.MAX_FRAMES + 2) {
      //organic frame: the index equal to the max frame which determined in the configuration.
      return [null, new Error('error: no more than 3 rounds can be played on the last organic frame')];
    }

    if (userInput?.rounds[0]) {
      if (Number.isInteger(userInput.rounds[0]) && userInput.rounds[0] <= config.MAX_PINS && userInput.rounds[0] > 0) {

        if (userInput.rounds[1]) {
          if (Number.isInteger(userInput.rounds[1]) && userInput.rounds[1] <= config.MAX_PINS && userInput.rounds[1] > 0) {
            if (userInput.rounds[0] + userInput.rounds[1] <= config.MAX_PINS) {
              return [true, null];
            } else {
              return [null, new Error('error: pin-down value must be bellow max-pins number')];
            }
          } else {
            return [null, new Error('error: invalid value for 2nd round')];
          }
        } else {
          if (userInput.rounds[0] === config.MAX_PINS) {
            return [false, new Error("error: 2nd round is mandatory if 1st round wasn't a strike")];
          } else {
            return [true, null];
          }
        }
      } else {
        return [null, new Error('error: invalid value for 1st round')];
      }
    } else {
      return [false, new Error("empty rounds values")];
    }


    return [false, null]
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

  public static is_game_over(arr: number[][], max_arr: number): [boolean | null, Error | null] {

    let frameStatus;

    if (arr.length - max_arr >= 0) {
      frameStatus = new Frame(arr[max_arr - 1]).status;

      //there are more rounds beyond the latest frame
      const extra_rounds: number | undefined = Utils.count_extra_rounds(arr, max_arr);
      // console.log({ extra_rounds })
      if (frameStatus === FrameStatus.NORMAL) {
        if (extra_rounds == 0) { return [true, null]; }
        else if (extra_rounds > 0) { return [null, new Error('too many rounds')]; }
      }

      if (frameStatus === FrameStatus.SPARE) {
        if (extra_rounds == 1) { return [true, null]; }
        else if (extra_rounds > 1) { return [null, new Error('too many rounds')]; }
      }

      if (frameStatus === FrameStatus.STRIKE) {
        if (extra_rounds == 2) { return [true, null]; }
        else if (extra_rounds > 2) { return [null, new Error('too many rounds')]; }
      }
    }
    return [false, null];
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



  getUpdatedDashboard(userInput: { frameIndex: number; rounds: number[]; }, dashboardInput: DashboardInput) {
    return new Promise((resolve, reject) => {
      let data, err;

      if (dashboardInput.frames.length !== userInput.frameIndex) {
        return reject(new Error('error: the frame index is not aligned with the next dashboard\'s frame index' + dashboardInput.frames.length + ':' + userInput.frameIndex));
      }

      [data, err] = Frame.isValidFrame(userInput, this.config);
      if (err) {
        return reject(err)
      }
      if (data === true) {
        dashboardInput.frames.push(new Frame(userInput.rounds));
        return resolve(dashboardInput);
      }
    });
  }

  calculateScore() {
    const MAX_FRAMES = this.frames.length;
    let score_next_round: number | undefined;
    let score_next_2_rounds: number | undefined;
    let total_score = 0;
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
        }


      } else {
        //extra 1 or 2 frames has no self-score
      }
      total_score += frame?.score ? frame.score : 0;

      return frame;
    }) //frames.map
    return { frames: this.frames, total_score: total_score };
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
        const expectedResult = 'frame index is not aligned';
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });

      test("frame with no rounds", async () => {
        const userInput = { frameIndex: 2, rounds: [] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const expectedResult = 'number of rounds';
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });

      test("frame with more than 2 rounds", async () => {
        const userInput = { frameIndex: 3, rounds: [1, 2, 3] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const expectedResult = 'frame index is not aligned';
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
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const dashboard_calculateScore = dashboard.calculateScore();
        const expectedResult =
          [{ "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": 0 }, { "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": 0 }];
        expect(dashboard_calculateScore.frames).toEqual(expectedResult);
      });

      test("frame has Spare", async () => {
        const userInput = { frameIndex: 2, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]], my_config);
        const dashboardUpdated = await dashboard.getUpdatedDashboard(userInput, dashboard);

        const expectedResult = new DashboardInput([[1, 2], [1, 2], [5, 5]], my_config);
        expect(JSON.stringify(dashboardUpdated)).toEqual(JSON.stringify(expectedResult));
      });

      test("frames has Strike", async () => {
        const dashboard: DashboardInput = new DashboardInput([[10], [10], [10], [10]], my_config);
        const dashboard_score = dashboard.calculateScore();
        const expectedResult = [{ "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }];
        expect(dashboard_score.frames).toEqual(expectedResult);
        expect(dashboard_score.total_score).toEqual(60);

      });
    });



    describe("a game is over", () => {
      describe("invalid status of dashboard", () => {
        test("setting a dashboard with invalid number of extra rounds", async () => {
          const [res_is_game_over, err] = DashboardInput.is_game_over([[10], [10], [10], [10], [8, 1]], my_config.MAX_FRAMES);
          expect(err!.message).toMatch("too many rounds");
        });
      });

      describe("valid status of dashboard", () => {
        test("setting a dashboard with max frames but with no satisfying extra rounds", async () => {
          const [res_is_game_over, err] = DashboardInput.is_game_over([[1], [10], [10]], my_config.MAX_FRAMES);
          expect(res_is_game_over).toBe(false);
        });
        test("setting a dashboard with max allowed number of extra rounds", async () => {
          const [res_is_game_over, err] = DashboardInput.is_game_over([[10], [10], [10], [10]], my_config.MAX_FRAMES);
          expect(res_is_game_over).toBe(true);
        });
        test("setting a dashboard with max allowed number of extra rounds", async () => {
          const [res_is_game_over, err] = DashboardInput.is_game_over([[10], [10], [10], [3]], my_config.MAX_FRAMES);
          expect(res_is_game_over).toBe(true);
        });
      });
    });

    // no more than three balls can be rolled in tenth frame

  });
});
