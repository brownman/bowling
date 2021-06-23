

steps:
-----
js:
----
- test game logic without models, just focus on the frame-status and userInput


typescript:
------
1 test the game logic
2 add basic express endpoints (later: express.router+controllers)
3 test the api using postman (later:test the api, don't hit the DB (use nock)
```typescript
//
class MyClass {
  constructor() {
  }


  public static async build(): Promise<MyClass> {
```

changelog:
-----
- install express
- install jest
- tdd game logic

todo:
------
- test client awareness: (which player should play and what is the game status)
- which turn is it
- which player should play next
- is it spare or strike
- current score (sum)