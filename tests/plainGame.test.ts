

const global_config = {
  MAX_FRAMES: 10,
  MAX_PINS: 10
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

  constructor(arr: number[][]) {
    this.frames = [];
    arr && arr.forEach(
      (item) => { this.frames.push(new Frame(item)) }
    );
  }

  next_round_score(index: number): number | undefined {
    return (this.frames[index + 1] && this.frames[index + 1].rounds[0]) ? this.frames[index + 1].rounds[0] : undefined;
  }

  next_2_rounds_score(index: number): number | undefined {
    if (this.frames[index + 1].status === FrameStatus.STRIKE) {
      return this.next_round_score(index + 2)
    } else {
      return (this.frames[index + 1] && this.frames[index + 1].rounds[1]) ? this.frames[index + 1].rounds[1] : undefined;
    }
  }

  calculateScore() {
    const MAX_FRAMES = this.frames.length;
    let score_next_round: number | undefined;
    let score_next_2_rounds: number | undefined;
    this.frames.map((frame, index) => {
      if (index < global_config.MAX_FRAMES) {
        switch (frame.status) {
          case FrameStatus.NORMAL:
            frame.score = frame.rounds[0] + (frame.rounds[1] ? frame.rounds[1] : 0);
            frame.self_score_calculated = true;
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

              if (score_next_2_rounds) { frame.score += score_next_2_rounds!; }

            }
            break;
          default:
            break;
            return frame;

        }
      } else {
        console.warn('extra 1 or 2 frames has no self-score')
      }
    }) //frames.map
    return this.frames;
  }//calculate




}



const getUpdatedDashboard = (userInput: { frameIndex: number; rounds: number[]; }, dashboardInput: DashboardInput) => {
  return new Promise((resolve, reject) => {
    const dashboardLastIndex = dashboardInput.frames.length;

    if (dashboardLastIndex === userInput.frameIndex && userInput.frameIndex < global_config.MAX_FRAMES + 1) {
      dashboardInput.frames.push(new Frame(userInput.rounds));

      resolve(dashboardInput);
    } else {
      reject(new Error('error: invalid frameIndex'));
    }
  });
}


describe("game logic", () => {
  describe("dashboard output", () => {
    describe("user input frame", () => {
      test("The user should send a frame with a frameIndex which maches the dashboard latest index", async () => {
        const userInput = { frameIndex: 3, rounds: [5, 5] };
        const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]]);
        const expectedResult = 'invalid';
        const dashboardUpdated = await getUpdatedDashboard(userInput, dashboard).catch((err) => {
          expect(err.message).toMatch(expectedResult);
        });
      });

      test("user adds 1 frame in normal status", async () => {
        const dashboard: DashboardInput = new DashboardInput([]);

        const userInput = { frameIndex: 0, rounds: [1, 2] };
        const dashboardUpdated = await getUpdatedDashboard(userInput, dashboard);
        const expectedResult = { "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] }

        expect(dashboardUpdated).toEqual(expectedResult);
      });

      test("user adds 2 frames in normal status", async () => {
        const dashboard: DashboardInput = new DashboardInput([[1, 2]]);
        const userInput = { frameIndex: 1, rounds: [1, 2] };
        const expectedResult = { "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }, { "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] }
        const dashboardUpdated = await getUpdatedDashboard(userInput, dashboard);
        expect((dashboardUpdated)).toEqual(expectedResult);
      });

      describe("frame's sum is 10", () => {
        test("frame has Spare", async () => {

          const userInput = { frameIndex: 2, rounds: [5, 5] };
          const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]]);
          const dashboardUpdated = await getUpdatedDashboard(userInput, dashboard);

          const expectedResult = new DashboardInput([[1, 2], [1, 2], [5, 5]]);
          expect(JSON.stringify(dashboardUpdated)).toEqual(JSON.stringify(expectedResult));

        });
      });
      describe("calculate score", () => {
        test("test 1", async () => {
          const userInput = { frameIndex: 2, rounds: [5, 5] };
          const dashboard: DashboardInput = new DashboardInput([[1, 2], [1, 2]]);
          const dashboard_calculateScore = dashboard.calculateScore(); //await getUpdatedDashboard(userInput, dashboard);
          const expectedResult = [{ "rounds": [1, 2], "score": 11, "self_score_calculated": true, "status": 0 }, { "rounds": [1, 2], "score": 10, "self_score_calculated": false, "status": 0 }];
          expect(dashboard_calculateScore).toEqual(expectedResult);

        });
      });

    });
  });
});
