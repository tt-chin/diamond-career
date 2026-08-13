import assert from "node:assert/strict";
import {newGame, allocate, choose, choices, startRetry, acceptOffer, overall, avgText, obp, slg, ops, era, whip} from "../src/app.js";

const input={name:"テスト選手",seed:"fixed-seed",position:"IF",type:"BALANCED",bats:"R",throws:"R"};
const a=newGame(input);
const b=newGame(input);
assert.deepEqual(a.dice,b.dice,"同じSeedの最初のサイコロが一致する");
assert.equal(overall(a),overall(b),"同じSeedの初期能力が一致する");

const before=overall(a);
allocate(a,["contact","contact","power","defense"]);
assert.ok(overall(a)>=before,"サイコロ配分後に総合力が低下しない");
for(const value of Object.values(a.player.abilities))assert.ok(value>=0&&value<=100,"能力値は0〜100");

const batting={G:100,PA:400,AB:350,H:105,_2B:20,_3B:3,HR:12,RBI:55,BB:50,SB:8,DEF:4};
assert.equal(avgText(batting),".300");
assert.equal(obp(batting),".388");
assert.equal(slg(batting),".477");
assert.equal(ops(batting),".865");

const pitching={G:30,IP:120,W:10,L:6,SV:0,HLD:0,SO:110,BB:40,H:100,ER:40};
assert.equal(era(pitching),"3.00");
assert.equal(whip(pitching),"1.17");

for(const position of ["P","C","IF","OF"]){
  for(let run=0;run<5;run++){
    const game=newGame({...input,position,seed:`career-${position}-${run}`});
    for(let guard=0;guard<500&&game.status!=="COMPLETED";guard++){
      if(game.pending==="ALLOCATE")allocate(game,game.dice.map(()=>position==="P"?"velocity":"contact"));
      else if(game.pending==="ROUTE")startRetry(game,"university");
      else if(game.pending?.offers)acceptOffer(game,0);
      else choose(game,choices(game)[0].id);
    }
    assert.equal(game.status,"COMPLETED",`${position}のキャリアが完走する`);
    assert.ok(game.career.age<=45,"最大45歳で引退する");
  }
}

console.log("engine smoke tests passed");
