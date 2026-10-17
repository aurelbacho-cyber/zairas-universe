
function makeHarness(html,Controls,Cockpit,Music){
  let now=0,next=0;
  const timers=new Map(),rafs=new Map(),elements=new Map(),events=new Map();
  const gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(6400)}),measureText:()=>({width:30})},{get:(o,k)=>k in o?o[k]:()=>{}});
  function element(id){
    if(!elements.has(id)){
      const classes=new Set(),e={id,width:900,height:700,videoWidth:640,videoHeight:480,readyState:4,srcObject:null,textContent:'',innerHTML:'',style:{},
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle(v,b){if(b===undefined)b=!classes.has(v);if(b)classes.add(v);else classes.delete(v);}},
        getContext:()=>context,play:()=>Promise.resolve(),setAttribute(){},addEventListener(){},querySelectorAll:()=>[]};
      elements.set(id,e);
    }return elements.get(id);
  }
  const env={console,Math,Date,Promise,Uint8ClampedArray,Number,Set,Map,Error,
    innerWidth:900,innerHeight:700,performance:{now:()=>now},
    matchMedia:()=>({matches:true}),location:{protocol:'https:',hostname:'test.local'},
    requestAnimationFrame:fn=>{const id=++next;rafs.set(id,fn);return id;},
    cancelAnimationFrame:id=>rafs.delete(id),
    setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,at:now+ms});return id;},
    clearTimeout:id=>timers.delete(id),setInterval:()=>++next,clearInterval:()=>{},
    addEventListener:(k,fn)=>events.set(k,fn),
    document:{hidden:false,getElementById:element,querySelector:q=>element(q),querySelectorAll:()=>[],createElement:()=>element('canvas-'+(++next)),addEventListener:(k,fn)=>events.set(k,fn)},
    navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[]})}},
    tf:{ready:async()=>{}},poseDetection:{movenet:{modelType:{MULTIPOSE_LIGHTNING:'multi',SINGLEPOSE_LIGHTNING:'single'}},SupportedModels:{MoveNet:'movenet'},TrackerType:{BoundingBox:'box'},createDetector:async()=>({estimatePoses:async()=>[],dispose(){}})},
    ZairaControls:Controls,ZairaCockpit:Cockpit,ZairaMusic:Music};
  env.window=env;env.self=env;env.top=env;env.isSecureContext=true;
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const api=(new Function('env','with(env){'+inline+';return {A,LIFE,GAME_META,startGame,stopAll,endGame,goMenu,initCamera,doCountdown,startLoop,initGame,addScore,loseLife,CountGame,MathGame,OrderGame,ColorSortGame,RunnerGame,BalloonGame,JumpDuck,HoldPicker};}'))(env);
  return{api,env,elements,timers,rafs,context,events,setNow:n=>now=n,async advance(ms){now+=ms;const due=[...timers].filter(([,t])=>t.at<=now);for(const [id,t]of due){timers.delete(id);t.fn();}await Promise.resolve();},frame(){const list=[...rafs];rafs.clear();for(const [,fn]of list)fn(now);}};
}

module.exports={makeHarness};
