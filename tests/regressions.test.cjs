const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/controls.js');
const {makeHarness}=require('./harness.cjs');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const W={};
new Function('window',fs.readFileSync(path.join(root,'src/cockpit.js'),'utf8'))(W);
new Function('window',fs.readFileSync(path.join(root,'src/music.js'),'utf8'))(W);

function pose(overrides={}){
  const p={score:.99,keypoints:Array.from({length:17},()=>({x:320,y:200,score:.99}))};
  p.keypoints[5]={x:240,y:150,score:.99};p.keypoints[6]={x:400,y:150,score:.99};
  p.keypoints[11]={x:270,y:300,score:.99};p.keypoints[12]={x:370,y:300,score:.99};
  p.keypoints[9]={x:230,y:220,score:.99};p.keypoints[10]={x:410,y:220,score:.99};
  for(const [i,k]of Object.entries(overrides))p.keypoints[+i]={...p.keypoints[+i],...k};
  return p;
}
test('steering treats wrist order as an unoriented line',()=>{
  const p=pose();assert.ok(Math.abs(C.wheelAngle(p))<1e-8);
  [p.keypoints[9],p.keypoints[10]]=[p.keypoints[10],p.keypoints[9]];
  assert.ok(Math.abs(C.wheelAngle(p))<1e-8);
});
test('steering calibrates, smooths and has a neutral dead zone',()=>{
  const control=new C.Steering();
  for(let t=0;t<=1000;t+=50)control.update(pose(),t);
  assert.ok(control.snapshot().ready);
  control.update(pose({10:{y:225}}),1050);assert.equal(control.value,0);
  for(let t=1100;t<1500;t+=50)control.update(pose({10:{y:300}}),t);
  assert.ok(control.value<-.2);
  assert.ok(!control.update(null,1500).ready);
});
test('calibration requires a continuous stable input',()=>{
  const c=new C.Steering();for(let t=0;t<500;t+=50)c.update(pose(),t);
  c.update(null,500);assert.equal(c.samples.length,0);
  assert.ok(!c.update(pose(),2000).ready);
});
test('steering smoothing is consistent at 15, 30 and 60 fps',()=>{
  const outputs=[15,30,60].map(fps=>{
    const c=new C.Steering();for(let t=0;t<=1000;t+=50)c.update(pose(),t);
    for(let i=1;i<=fps;i++)c.update(pose({10:{y:290}}),1000+i*1000/fps);
    return c.value;
  });
  assert.ok(Math.max(...outputs)-Math.min(...outputs)<.015);
});
test('crouching cannot be mistaken for an upward jump',()=>{
  const c=new C.BodyGesture();for(let t=0;t<=1000;t+=50)c.update(pose(),t);
  assert.ok(c.base);
  assert.equal(c.update(pose({5:{y:200},6:{y:200},11:{y:330},12:{y:330}}),1050),'duck');
  assert.equal(c.update(pose({5:{y:105},6:{y:105},11:{y:255},12:{y:255}}),1100),'jump');
  assert.equal(c.update(null,1150),'run');
});
test('arm raising does not trigger a jump or crouch',()=>{
  const c=new C.BodyGesture();for(let t=0;t<=1000;t+=50)c.update(pose(),t);
  assert.equal(c.update(pose({9:{y:25},10:{y:20}}),1050),'run');
});
test('answer circles do not overlap on small screens',()=>{
  for(const W of [320,390,768,1440])for(const H of [480,844,900]){
    const opts=C.answerLayout([1,2,3],W,H);
    assert.ok(opts.every(o=>o.x-o.r>=0&&o.x+o.r<=W));
    assert.ok(opts[1].x-opts[0].x>opts[0].r+opts[1].r);
  }
});
test('an answer needs a fresh release after confirmation',()=>{
  const p=new C.HoldPicker(100),opts=[{id:1,x:20,y:20,r:10}],hands=[{x:20,y:20}];
  p.check(hands,opts,0);assert.equal(p.check(hands,opts,100).pickedId,1);
  assert.equal(p.check(hands,[{...opts[0],id:2}],250).pickedId,null);
  p.check([],opts,300);p.check(hands,opts,400);
  assert.equal(p.check(hands,opts,500).pickedId,1);
});
test('generated maths always has one correct answer and valid integer division',()=>{
  let seed=123456;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const operations=new Set();
  for(const level of ['baby','kid','pro'])for(let i=0;i<1000;i++){
    const q=C.mathRound(level,random);assert.equal(new Set(q.options).size,3);
    assert.equal(q.options.filter(n=>n===q.ans).length,1);
    const actual=q.op==='+'?q.a+q.b:q.op==='−'?q.a-q.b:q.op==='×'?q.a*q.b:q.a/q.b;
    assert.equal(actual,q.ans);assert.ok(q.ans>=0&&Number.isInteger(q.ans));
    if(level==='baby')assert.ok(q.ans<=5);
    if(level==='pro')operations.add(q.op);
  }
  assert.equal(operations.size,4);
});
test('tempo changes density independently of target age',()=>{
  const a=C.balloonProfile('lively','baby',390,844),b=C.balloonProfile('lively','pro',390,844);
  assert.equal(a.seconds,b.seconds);assert.equal(a.interval,b.interval);
  assert.ok(C.balloonProfile('challenge','baby',900,700).interval<a.interval);
});
function app(){return makeHarness(html,C,W.ZairaCockpit,W.ZairaMusic);}
test('registry removes both dinosaur games and keeps 13 games',()=>{
  const h=app();assert.equal(Object.keys(h.api.GAME_META).length,14);
  assert.ok(!h.api.GAME_META.hunt&&!h.api.GAME_META.nest);assert.ok(h.api.GAME_META.glass.coop);
});
test('every game constructs, updates and draws with a simulated canvas',()=>{
  const h=app();h.api.A.canvas=h.env.document.getElementById('gc');h.api.A.ctx=h.context;h.api.A.video=h.env.document.getElementById('cam');
  for(const type of Object.keys(h.api.GAME_META)){
    h.api.A.gameType=type;h.api.initGame(type);
    h.api.A.game.update([],900,700,1/60);h.api.A.game.draw(h.context,900,700);
  }
});
test('regular game end stops the camera and detaches the video',()=>{
  const h=app();let stopped=0;const video=h.env.document.getElementById('cam');
  h.api.A.video=video;h.api.A.stream={getTracks:()=>[{stop:()=>stopped++}]};video.srcObject=h.api.A.stream;
  h.api.A.running=true;h.api.A.gameType='balloons';h.api.endGame();
  assert.equal(stopped,1);assert.equal(video.srcObject,null);assert.equal(h.api.A.running,false);
  assert.ok(h.env.document.getElementById('results').classList.contains('active'));
  h.api.goMenu();assert.equal(h.timers.size,0);
});
test('cancelled countdown rejects and cannot reactivate a session',async()=>{
  const h=app(),id=h.api.LIFE.epoch;const countdown=h.api.doCountdown('Test',id);
  h.api.stopAll();await assert.rejects(countdown,{name:'AbortError'});
  assert.equal(h.timers.size,0);assert.equal(h.api.A.running,false);
});
test('a camera stream arriving after cancellation is stopped immediately',async()=>{
  const h=app();let give,stops=0;
  h.env.navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>give=resolve);
  const p=h.api.initCamera(h.api.LIFE.epoch);h.api.stopAll();
  give({getTracks:()=>[{stop:()=>stops++}]});
  await assert.rejects(p,{name:'AbortError'});assert.equal(stops,1);assert.equal(h.api.A.stream,null);
});
test('late inference cannot update or schedule the next game',async()=>{
  const h=app();const baselineRafs=h.rafs.size;let finish,updates=0;h.api.A.running=true;h.api.A.gameType='balloons';
  h.api.A.canvas=h.env.document.getElementById('gc');h.api.A.ctx=h.context;h.api.A.video=h.env.document.getElementById('cam');
  h.api.A.detector={estimatePoses:()=>new Promise(resolve=>finish=resolve)};
  h.api.A.game={update:()=>updates++,draw(){}};
  h.api.startLoop();h.frame();await Promise.resolve();
  h.api.stopAll();finish([pose()]);await Promise.resolve();await Promise.resolve();
  assert.equal(updates,0);assert.equal(h.api.A.poses.length,0);assert.equal(h.rafs.size,baselineRafs);
});
test('baby policy applies centrally to every negative score and life loss',()=>{
  const h=app();h.api.A.gameType='sort';h.api.A.mode='lives';h.api.A.diff='baby';h.api.A.score=20;
  h.api.addScore(-5);h.api.loseLife();assert.equal(h.api.A.score,20);assert.equal(h.api.A.lives,5);
  h.api.A.diff='pro';h.api.addScore(-5);h.api.loseLife();assert.equal(h.api.A.score,15);assert.equal(h.api.A.lives,4);
});
test('colour sorting keeps its rule while old items are active',()=>{
  const h=app();const game=new h.api.ColorSortGame();let changes=0;game.pick=()=>changes++;
  game.items=[{x:.1,y:.5,vy:0,c:game.left,r:25}];h.api.A.simTime=21000;game.last=21000;
  game.update([],900,700);assert.equal(changes,0);
});
test('number sequence accepts at most one deliberate selection',()=>{
  const h=app();h.api.A.canvas=h.env.document.getElementById('gc');h.api.A.video=h.env.document.getElementById('cam');
  const game=new h.api.OrderGame();assert.equal(game.balls.length,3);
  assert.ok(game.balls.every(b=>b.r<60));assert.equal(game.next,1);
  game.picker.check=()=>({pickedId:1,hoverId:1,progress:1});
  game.update([pose()],900,700);
  assert.equal(game.next,2);assert.equal(game.balls.filter(b=>b.popped).length,1);
  game.update([pose()],900,700);assert.equal(game.next,2);
});
test('cockpit pauses distance and collisions when hands are missing',()=>{
  const h=app();h.api.A.gameType='car';h.api.A.canvas=h.env.document.getElementById('gc');h.api.initGame('car');
  const g=h.api.A.game;for(let t=0;t<=1000;t+=50){h.setNow(t);g.update([pose()],900,700,.05);}
  assert.ok(g.ready);const distance=g.distance;
  h.setNow(1100);g.update([],900,700,.1);
  assert.equal(g.distance,distance);assert.equal(g.ready,false);
});

test('camera is cleaned up if the pose model fails during startup',async()=>{
  const h=app();let stops=0;
  h.env.navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop:()=>stops++}]});
  h.env.poseDetection.createDetector=async()=>{throw new Error('test model failure');};
  await h.api.startGame('balloons');
  assert.equal(stops,1);assert.equal(h.api.A.stream,null);assert.equal(h.api.A.running,false);
});
test('simulation advances the same number of steps at 15, 30 and 60 render fps',async()=>{
  const counts=[];
  for(const fps of [15,30,60]){
    const h=app();let count=0;h.api.A.video=h.env.document.getElementById('cam');h.api.A.running=true;h.api.A.gameType='balloons';
    h.api.A.canvas=h.env.document.getElementById('gc');h.api.A.ctx=h.context;
    h.api.A.poses=[pose()];h.api.A.poseOK=true;h.api.A.lastPoseAt=0;
    h.api.A.game={update:()=>count++,draw(){}};
    h.api.startLoop();
    for(let i=1;i<=fps;i++){h.setNow(i*1000/fps);h.api.A.lastPoseAt=i*1000/fps;h.frame();}
    counts.push(count);
  }
  assert.ok(Math.max(...counts)-Math.min(...counts)<=1);assert.ok(Math.min(...counts)>=59);
});
