'use strict';

import {Config, FrameStatus, DashboardInput, Frame} from '../src/dashboard';



describe("test game rules", () => {
  let my_config: Config;

  beforeAll(() => {
    my_config = {
      MAX_FRAMES: 2,
      MAX_PINS: 10
    }
  });

  describe("dashboard class", () => {

    describe("extending the dashboard", () => {
      describe("by adding a valid frame", () => {

        test("user adds a non-bonus frame", () => {
          let dashboardUpdated, err;

          const dashboard: DashboardInput = new DashboardInput(my_config, []);

          const userInput = { frameIndex: 0, rounds: [1, 2] };
          [dashboardUpdated, err] = dashboard.getUpdatedDashboard(userInput, dashboard);
          const expectedResult = { "config": my_config, "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] };

          expect(dashboardUpdated).toEqual(expectedResult);
        });

        test("user adds 2 non-bonus frames", () => {
          let dashboardUpdated, err;

          const dashboard: DashboardInput = new DashboardInput(my_config, [[1, 2]]);
          const userInput = { frameIndex: 1, rounds: [1, 2] };
          const expectedResult = { "config": my_config, "frames": [{ "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }, { "rounds": [1, 2], "self_score_calculated": false, "status": FrameStatus.NORMAL }] }
          const obj = dashboard.getUpdatedDashboard(userInput, dashboard);
          [dashboardUpdated, err] = obj

          expect(dashboardUpdated).toEqual(expectedResult);
        });
      });


      describe("dashboard is not extended", () => {
        test("frameIndex not in sync with the dashboard's latest frame position", () => {
          let dashboardUpdated, err;
          const userInput = { frameIndex: 3, rounds: [5, 5] };
          const dashboard: DashboardInput = new DashboardInput(my_config, [[1, 2], [1, 2]]);
          const expectedResult = 'frame index is not aligned';
          [dashboardUpdated, err] = dashboard.getUpdatedDashboard(userInput, dashboard);
          expect(err.message).toMatch(expectedResult);

        });

        describe("more frame validation", () => {
          test("frame with no rounds", () => {
            const userInput = { frameIndex: 2, rounds: [] };
            const expectedResult = 'number of rounds';
            let data, err;
            [data, err] = Frame.isValidFrame(my_config, userInput.rounds);
            expect(err.message).toMatch(expectedResult);
          });

          test("frame with more than 2 rounds", () => {
            const userInput = { frameIndex: 3, rounds: [1, 2, 3] };
            const expectedResult = 'invalid number of rounds';
            let data, err;
            [data, err] = Frame.isValidFrame(my_config, userInput.rounds);
            expect(err.message).toMatch(expectedResult);
          });

          test("round should be a native number", () => {
            const userInput = { frameIndex: 3, rounds: [0, -1] };
            let data, err;
            [data, err] = Frame.isValidFrame(my_config, userInput.rounds);
            expect(err.message).toMatch('invalid value for 2nd round: should be integer and between 0 to MAX_PINS');
          });

          test("rounds' sum should be lower than MAX_PINS value", () => {
            const userInput = { frameIndex: 3, rounds: [my_config.MAX_PINS, 1] };
            let data, err;
            [data, err] = Frame.isValidFrame(my_config, userInput.rounds);
            expect(err.message).toMatch('the sum of the pin-down values must be bellow MAX_PINS number');
          });

          test("2nd round is mandatory if 1st wasn't a Strike", () => {
            const userInput = { frameIndex: 3, rounds: [1] };
            let data, err;
            [data, err] = Frame.isValidFrame(my_config, userInput.rounds);
            expect(err.message).toMatch('2nd round is mandatory if 1st round wasn\'t a strike');
          });
        });
      });
    });
  });


  describe("calculate score", () => {

    test("test normal frames (their sum is less than 10)", () => {
      const dashboard: DashboardInput = new DashboardInput(my_config, [[1, 2], [1, 2]]);
      const dashboard_calculateScore = dashboard.calculateScore();
      const expectedResult =
        [{ "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": FrameStatus.NORMAL }, { "rounds": [1, 2], "score": 3, "self_score_calculated": true, "status": FrameStatus.NORMAL }];
      expect(dashboard_calculateScore.frames).toEqual(expectedResult);
    });

    test("frame has Spare", () => {
      let dashboardUpdated, err;
      const userInput = { frameIndex: 2, rounds: [5, 5] };
      const dashboard: DashboardInput = new DashboardInput(my_config, [[1, 2], [1, 2]]);
      [dashboardUpdated, err] = dashboard.getUpdatedDashboard(userInput, dashboard);

      const expectedResult = new DashboardInput(my_config, [[1, 2], [1, 2], [5, 5]]);
      expect(JSON.stringify(dashboardUpdated)).toEqual(JSON.stringify(expectedResult));
    });

    test("frames has Strike", () => {
      const dashboard: DashboardInput = new DashboardInput(my_config, [[10], [10], [10], [10]]);
      const dashboard_score = dashboard.calculateScore();
      const expectedResult = [{ "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "score": 30, "self_score_calculated": true, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }, { "rounds": [10], "self_score_calculated": false, "status": 2 }];
      expect(dashboard_score.frames).toEqual(expectedResult);
      expect(dashboard_score.total_score).toEqual(60);

    });
  });



  describe("a game is over", () => {
    describe("invalid status of dashboard", () => {
      test("setting a dashboard with invalid number of extra rounds", () => {
        const [res_is_game_over, err] = DashboardInput.is_game_over(my_config, [[10], [10], [10], [10], [8, 1]], my_config.MAX_FRAMES);
        expect(err!.message).toMatch("too many rounds");
      });
    });

    describe("valid status of dashboard", () => {
      test("setting a dashboard with max frames but with no satisfying extra rounds", () => {
        const [res_is_game_over, err] = DashboardInput.is_game_over(my_config, [[1], [10], [10]], my_config.MAX_FRAMES);
        expect(res_is_game_over).toBe(false);
      });
      test("setting a dashboard with max allowed number of extra rounds", () => {
        const [res_is_game_over, err] = DashboardInput.is_game_over(my_config, [[10], [10], [10], [10]], my_config.MAX_FRAMES);
        expect(res_is_game_over).toBe(true);
      });
    });
  });
});

