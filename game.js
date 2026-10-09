(()=>{
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const intro=document.getElementById('intro'),help=document.getElementById('help'),hud=document.getElementById('hud'),dialogue=document.getElementById('dialogue');
let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
const keys={left:false,right:false,jump:false};let running=false,cam=0,frame=0,dialogueIndex=-1,toastTimer=0,completed=false;
const worldW=3000,groundY=()=>H*.79;
const player={x:90,y:0,vx:0,vy:0,w:28,h:49,onGround:false,face:1,walk:0};
const lines=[
['NARRATOR','8:07 AM. The city smells like rain, warm bread, and exhaust. Nothing about today feels historic.'],
['MIRA','You said you would be early. The train leaves in six minutes!'],
['YOU','I am early. The clock is just being dramatic.'],
['NARRATOR','A siren winds through the distant streets. Nobody stops walking. Not yet.'],
['PHONE NOTIFICATION','CITY ALERT: Reports of a disturbance near Central Station. Please remain calm and follow official guidance.'],
['MIRA','...Did you hear that? Why are all the emergency vehicles going the same way?'],
['NARRATOR','For a moment, the whole street seems to hold its breath. Then a shopkeeper pulls down the shutters.'],
['YOU','We should get to the station. Come on.']
];
const landmarks=[{x:370,w:170,h:.36,c:'#49657b',label:'BAKERY'},{x:790,w:205,h:.49,c:'#38516b',label:'BOOKSHOP'},{x:1320,w:185,h:.41,c:'#536b7b',label:'FLOWERS'},{x:1830,w:230,h:.54,c:'#354b63',label:'CITY CLINIC'},{x:2500,w:260,h:.47,c:'#3b536b',label:'CENTRAL STATION'}];
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawSky(){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#172b48');g.addColorStop(.48,'#7c718b');g.addColorStop(.77,'#e99b85');g.addColorStop(1,'#f5c18d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // sun
 ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(W*.77,H*.27,Math.min(W,H)*.075,0,Math.PI*2);ctx.fill();
 // distant hills
 for(let i=0;i<7;i++){let x=((i*220-cam*.12)% (W+300)+W+300)%(W+300)-100;ctx.fillStyle=i%2?'#5b6279':'#475a72';ctx.beginPath();ctx.moveTo(x,H*.67);ctx.lineTo(x+95,H*(.38+(i%3)*.05));ctx.lineTo(x+220,H*.67);ctx.fill()}
 // skyline
 for(let i=0;i<17;i++){let x=((i*145-cam*.23)%(W+200)+W+200)%(W+200)-80;let bh=H*(.15+(i*37%17)/100);ctx.fillStyle=i%2?'#33465f':'#3b4c65';ctx.fillRect(x,H*.68-bh,95,bh);for(let wy=H*.68-bh+15;wy<H*.66;wy+=17)for(let wx=x+12;wx<x+84;wx+=19){ctx.fillStyle='#f6cf9a66';ctx.fillRect(wx,wy,6,8)}}
}
function drawStreet(){const gy=groundY();ctx.fillStyle='#d9a47f';ctx.fillRect(0,gy,W,H-gy);ctx.fillStyle='#596579';ctx.fillRect(0,gy+12,W,H-gy-12);ctx.fillStyle='#f4d5a0';for(let x=-((cam*.7)%100);x<W;x+=100)ctx.fillRect(x,gy+H*.12,42,4);
 // sidewalks
 ctx.fillStyle='#ead2ad';ctx.fillRect(0,gy,W,12);
 for(const b of landmarks){let x=b.x-cam;if(x<-b.w-20||x>W+20)continue;let bh=H*b.h,by=gy-bh;ctx.fillStyle=b.c;ctx.fillRect(x,by,b.w,bh);ctx.fillStyle='#e5c4a0';ctx.fillRect(x-5,by,b.w+10,8);ctx.fillStyle='#24364d';ctx.fillRect(x+12,by+18,b.w-24,26);
 for(let wy=by+60;wy<gy-45;wy+=42)for(let wx=x+15;wx<x+b.w-18;wx+=36){ctx.fillStyle=((wx+wy)%3)?'#f7d69b':'#9bb8c7';ctx.fillRect(wx,wy,18,22)}
 ctx.fillStyle='#f8e8ce';ctx.fillRect(x+b.w*.35,gy-68,b.w*.3,68);ctx.fillStyle='#293b51';ctx.fillRect(x+b.w*.35+5,gy-62,b.w*.3-10,57);ctx.fillStyle='#fff0cf';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(b.label,x+b.w/2,by+40)}
 // people in distance
 for(let i=0;i<12;i++){let x=((i*170-cam*.58)%(W+100)+W+100)%(W+100)-30;let y=gy-9;ctx.fillStyle=['#344b64','#784f5e','#526a68'][i%3];ctx.beginPath();ctx.arc(x,y-28,7,0,Math.PI*2);ctx.fill();ctx.fillRect(x-6,y-21,12,25)}
}
function drawPlayer(){let sx=player.x-cam,gy=groundY();if(sx<-100||sx>W+100)return;let bob=player.onGround&&Math.abs(player.vx)>.5?Math.sin(player.walk)*2:0;ctx.save();ctx.translate(sx,player.y+bob);if(player.face<0){ctx.translate(player.w,0);ctx.scale(-1,1)}
 // shadow
 ctx.globalAlpha=.22;ctx.fillStyle='#152339';ctx.beginPath();ctx.ellipse(player.w/2,gy-player.y+2,17,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 // legs and sneakers
 let stride=player.onGround?Math.sin(player.walk)*5:0;ctx.strokeStyle='#25374c';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(11,34);ctx.lineTo(10+stride,45);ctx.moveTo(19,34);ctx.lineTo(20-stride,45);ctx.stroke();ctx.strokeStyle='#f8d8b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(6+stride,46);ctx.lineTo(13+stride,46);ctx.moveTo(17-stride,46);ctx.lineTo(24-stride,46);ctx.stroke();
 // body
 roundRect(4,16,21,22,7,'#e9a45f');roundRect(5,18,19,17,5,'#f1b76f');
 // neck/head
 ctx.fillStyle='#d99172';ctx.fillRect(12,12,7,7);ctx.fillStyle='#e9b08e';ctx.beginPath();ctx.arc(15,8,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#392f42';ctx.beginPath();ctx.arc(14,5,10,Math.PI,Math.PI*2);ctx.lineTo(23,8);ctx.lineTo(21,2);ctx.fill();ctx.fillStyle='#25374c';ctx.fillRect(17,8,2,2);
 // backpack
 roundRect(0,20,7,15,3,'#6bb6a6');
 ctx.restore()}
function drawDetails(){const gy=groundY();for(let i=0;i<14;i++){let x=((i*260-cam*.9)%(W+120)+W+120)%(W+120)-30;ctx.fillStyle='#e8d1a3';ctx.fillRect(x,gy-2,3,4);ctx.fillStyle='#8d6c65';ctx.fillRect(x+7,gy-17,2,17)}}
function draw(){ctx.clearRect(0,0,W,H);drawSky();drawStreet();drawDetails();drawPlayer();if(running&&!completed){let progress=Math.min(100,Math.round(player.x/(worldW-100)*100));document.getElementById('objective').textContent=progress<30?'Reach the station':progress<58?'Follow the main street':progress<84?'Something feels wrong…':'Find the station entrance';}}
function showToast(t){let el=document.getElementById('toast');el.textContent=t;el.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.opacity=0,2400)}
function say(i){dialogueIndex=i;if(i>=lines.length){dialogue.style.display='none';return}document.getElementById('speaker').textContent=lines[i][0];document.getElementById('line').textContent=lines[i][1];dialogue.style.display='block';}
function advance(){if(dialogue.style.display==='block'){say(dialogueIndex+1);if(dialogueIndex===lines.length-1)showToast('The street is no longer ordinary. Keep going.');}}
function begin(){intro.hidden=true;help.hidden=true;hud.hidden=false;running=true;player.y=groundY()-player.h; say(0);showToast('Move with A / D or the arrow keys.');}
document.getElementById('start').onclick=begin;document.getElementById('how').onclick=()=>{intro.hidden=true;help.hidden=false};document.getElementById('back').onclick=begin;
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp',' ','Enter'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.left=true;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.right=true;if(e.key===' '||e.key==='ArrowUp'||e.key.toLowerCase()==='w')keys.jump=true;if(e.key.toLowerCase()==='e'||e.key==='Enter'||e.key===' '){if(running)advance()}});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.left=false;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.right=false;if(e.key===' '||e.key==='ArrowUp'||e.key.toLowerCase()==='w')keys.jump=false});
document.querySelectorAll('.touch').forEach(btn=>{const k=btn.dataset.key;const down=e=>{e.preventDefault();if(k==='left')keys.left=true;if(k==='right')keys.right=true;if(k==='jump'){keys.jump=true;advance()}if(k==='talk')advance()};const up=e=>{e.preventDefault();if(k==='left')keys.left=false;if(k==='right')keys.right=false;if(k==='jump')keys.jump=false};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up)});
function loop(){frame++;if(running&&!completed&&dialogue.style.display!=='block'){let dir=(keys.right?1:0)-(keys.left?1:0);player.vx+=(dir*3.2-player.vx)*.23;if(dir)player.face=dir;player.x=Math.max(25,Math.min(worldW-60,player.x+player.vx));if(keys.jump&&player.onGround){player.vy=-10.5;player.onGround=false}player.vy+=.48;player.y+=player.vy;let floor=groundY()-player.h;if(player.y>=floor){player.y=floor;player.vy=0;player.onGround=true}if(Math.abs(player.vx)>.3)player.walk+=.18;cam=Math.max(0,Math.min(worldW-W,player.x-W*.34));if(player.x>worldW-170){completed=true;document.getElementById('chapter').textContent='CHAPTER 01 · COMPLETE';say(lines.length);setTimeout(()=>{document.getElementById('speaker').textContent='END OF DEMO';document.getElementById('line').textContent='You reach the station just as the first screams rise behind you. The next chapter begins soon.';dialogue.style.display='block';showToast('Chapter 01 complete — more story is coming.')},150)}}draw();requestAnimationFrame(loop)}loop();
})();
