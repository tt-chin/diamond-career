import assert from "node:assert/strict";
import {newGame, allocate, trainingCost, applyTrainingPoints, choose, choices, startRetry, acceptOffer, overall, avgText, obp, slg, ops, era, whip} from "../src/app.js";

const input={name:"テスト選手",seed:"fixed-seed",position:"IF",type:"BALANCED",bats:"R",throws:"R"};
const a=newGame(input);
const b=newGame(input);
assert.deepEqual(a.dice,b.dice,"同じSeedの最初のサイコロが一致する");
assert.deepEqual(a.player.abilityCaps,b.player.abilityCaps,"同じSeedの能力上限が一致する");
assert.equal(overall(a),overall(b),"同じSeedの初期能力が一致する");
const otherSeed=newGame({...input,seed:"another-seed"});
assert.notDeepEqual(a.player.abilityCaps,otherSeed.player.abilityCaps,"異なるSeedで能力上限が変化する");

const before=overall(a);
allocate(a,["contact","contact","power","defense"]);
assert.ok(overall(a)>=before,"サイコロ配分後に総合力が低下しない");
for(const value of Object.values(a.player.abilities))assert.ok(value>=0&&value<=100,"能力値は0〜100");
assert.equal(trainingCost(59,60),1,"初期上限未満は1点で成長する");
assert.equal(trainingCost(60,60),3,"初期上限到達後は最低3点必要");
assert.equal(trainingCost(85,60),5,"80台は5点必要");
assert.equal(trainingCost(92,60),10,"90〜94は10点必要");
assert.equal(trainingCost(98,60),20,"95以上は20点必要");
const trainee={abilities:{power:60},abilityCaps:{power:60},trainingPoints:{power:0}};
applyTrainingPoints(trainee,"power",2);
assert.deepEqual([trainee.abilities.power,trainee.trainingPoints.power],[60,2],"不足点を繰り越す");
applyTrainingPoints(trainee,"power",4);
assert.deepEqual([trainee.abilities.power,trainee.trainingPoints.power],[62,0],"繰越点を次回の成長に使う");
trainee.abilities.power=99;trainee.trainingPoints.power=19;applyTrainingPoints(trainee,"power",6);
assert.deepEqual([trainee.abilities.power,trainee.trainingPoints.power],[100,0],"能力最大値100で停止する");

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
