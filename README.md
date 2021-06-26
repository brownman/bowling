bowling game
------

config file
--------
- to support shorter test scenarios the following constants were adapted as parameters: 
- frames length per dashboard (10)
- max pin-down per frame (10)


using the Frame class:
------------
- use Frame.create for generating a new Frame instance (it adds a validation step before the generation).


instructions & API:
-----
```
- User enters his name and hit “start”:
--  POST /user: userSetName{name:string}

- And the app will show the top 5 scores
-- GET /highscores - 


- for every frame, The user is asked to fill in the number of pins he knocked down:
--  post /dashboard: request: {rounds:Array<number>}, response: {frames:Array<Frame>, total_score, is_game_over}

- If a bonus is granted there will be a highlighting in the UX:
--  post /dashboard response: { frames:Array<Frame>, ... }. each Frame object has its input(a frame's rounds) and its output: score and flags: 
--- each flag has a single status from the following list: (normal(no bonus)/Sparse(bonus)/Strike(bonus)), so the highlight is resolved based on this flag.

- All through the game, the user will see his score board and after every input the score board - will update
-- post /dashboard response: { frames:Array<Frame>, ... }, where each frame has the Frame instance properties, including a score(a frame's score may also depends on future rounds and therefor will be resolved only after the frame's following round or two. the resolution is indicated by the flag: self_score_calculated:boolean).

- The final score is presented to the user 
-- post /dashboard response: {total_score:number ,is_game_over:boolean ... }


```
