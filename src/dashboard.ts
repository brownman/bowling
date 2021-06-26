'use strict';

export type Config = {
    MAX_FRAMES: number,
    MAX_PINS: number
}

export enum FrameStatus {
    'NORMAL',
    'SPARE',
    'STRIKE'
}

export class Utils {
    static count_extra_rounds(arr: number[][], limit: number): number {
        const arr_sliced = arr.slice(limit, arr.length);
        return arr_sliced.reduce((accumulator, currentArr) => {
            accumulator += (currentArr.length);

            return accumulator;
        }, 0);
    }
}

export class Frame {

    rounds!: number[];
    status?: FrameStatus;
    score?: number;
    self_score_calculated?: boolean;

    setFrameStatusByScore(rounds: number[], config: Config) {
        this.self_score_calculated = false;
        if (rounds[0] === config.MAX_PINS) {
            this.status = FrameStatus.STRIKE;
        } else if (rounds[1] && (rounds[0] + rounds[1]) === config.MAX_PINS) {
            this.status = FrameStatus.SPARE;
        } else {
            this.status = FrameStatus.NORMAL;
        }
    }

    constructor(config: Config, rounds: number[], status?: FrameStatus, self_score_calculated?: boolean) {
        this.self_score_calculated = self_score_calculated;
        this.rounds = rounds;
        if (status) {
            this.status = status;
        } else {
            this.setFrameStatusByScore(rounds, config)
        }
    }

    static createFrame(config: Config, rounds: number[]) {
        const [is_valid, err] = Frame.isValidFrame(config, rounds)
        if (is_valid) {
            return new Frame(config, rounds);
        } else {
            throw (err);
        }
    }

    static isValidFrame(config: Config, rounds: number[]): [boolean | null, Error | null] {
        //console.log({ rounds })
        if (rounds.length === 0 || rounds.length > 2) {
            return [null, new Error('invalid number of rounds:' + rounds)];
        }




        if (rounds && rounds.length > 0) {
            if (Number.isInteger(rounds[0]) && rounds[0] <= config.MAX_PINS && rounds[0] >= 0) {

                if (typeof rounds[1] !== 'undefined') {
                    if (Number.isInteger(rounds[1]) && rounds[1] <= config.MAX_PINS && rounds[1] >= 0) {
                        if (rounds[0] + rounds[1] <= config.MAX_PINS) {
                            return [true, null];
                        } else {
                            return [null, new Error('the sum of the pin-down values must be bellow MAX_PINS number')];
                        }
                    } else {
                        return [null, new Error('invalid value for 2nd round: should be integer and between 0 to MAX_PINS')];
                    }
                } else {
                    if (rounds[0] !== config.MAX_PINS) {
                        return [false, new Error("2nd round is mandatory if 1st round wasn't a strike")];
                    } else {
                        return [true, null];
                    }
                }
            } else {
                return [null, new Error('invalid value for 1st round: should be integer and between 0 to MAX_PINS')];
            }
        } else {
            return [false, new Error("empty rounds values")];
        }


        return [false, null]
    }
}

export class DashboardInput {
    frames!: Frame[];
    config!: Config;


    //accept: array of rounds[,]
    constructor(local_config: Config, arr: number[][]) {
        this.config = local_config;
        this.frames = [];
        //  this.count_extra_rounds(arr, this.config.MAX_FRAMES);
        const res_is_game_over = DashboardInput.is_game_over(local_config, arr, this.config.MAX_FRAMES);
        arr && arr.forEach(
            (rounds) => {
                let frame;
                try {
                    frame = Frame.createFrame(local_config, rounds);

                } catch (e) {
                    throw (e)
                }

                this.frames.push(frame);
            }
        );
    }

    public static is_game_over(config: Config, arr: number[][], max_arr: number): [boolean | null, Error | null] {

        let frameStatus;

        if (arr.length - max_arr >= 0) {
            frameStatus = new Frame(config, arr[max_arr - 1]).status;

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


    //[undefined|  null, Error | null] 
    getUpdatedDashboard(userInput: { frameIndex: number; rounds: number[]; }, dashboardInput: DashboardInput): [null | any, null | Error] {
        let err;

        if (dashboardInput.frames.length !== userInput.frameIndex) {
            return [null, new Error('the frame index is not aligned with the next dashboard\'s frame index: ' + dashboardInput.frames.length + ':' + userInput.frameIndex)];
        }


        let frame_tmp;
        try {
            frame_tmp = Frame.createFrame(this.config, userInput.rounds);

        } catch (e) {
            return [null, e];
        }
        dashboardInput.frames.push(frame_tmp);
        return [dashboardInput, null];

    }

    calculateScore() {
        const MAX_FRAMES = this.frames.length;
        let score_next_round: number | undefined;
        let score_next_2nd_rounds: number | undefined;
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
                            score_next_2nd_rounds = this.next_2_rounds_score(index);
                            //console.info({ score_next_2nd_rounds })
                            if (score_next_2nd_rounds) {
                                frame.score += score_next_2nd_rounds!; frame.self_score_calculated = true;
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

