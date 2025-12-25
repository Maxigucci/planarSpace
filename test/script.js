import {createNoise2D} from './simplex-noise.min.js';

const seededRandom=(seed)=>{
  // ensure seed is a positive integer
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;

  return function() {
    value = (value * 16807) % 2147483647;
    return value / 2147483647; // returns [0, 1)
  };
}
const prng= seededRandom(12345);
const noise2D = createNoise2D(prng);
// 1D wrapper
const noise1D=(t)=>{ return noise2D(t, 0)}
const scaledNoise1D=(t, min, max)=>{
  const n = noise1D(t);      // [-1, 1]
  return min + ((n+1)/2) * (max-min);
}


function resizeCanvas(){
  const ratioWidth = 3; 
  const ratioHeight = 3;
  const longestSideScreenRatio = 0.83;
  const canvasAspectRatio = ratioWidth / ratioHeight;
  const windowAspectRatio = window.innerWidth / window.innerHeight;
  let canvasWidth = 0; 
  let canvasHeight = 0;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if(windowAspectRatio > canvasAspectRatio){
    canvasHeight = window.innerHeight * longestSideScreenRatio;
    canvasWidth = (canvasHeight / ratioHeight) * ratioWidth;
  } else {
    canvasWidth = window.innerWidth * longestSideScreenRatio;
    canvasHeight = (canvasWidth / ratioWidth) * ratioHeight;
  }

  //set canvas DOM height & width
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  //set canvas resolution height & width
  const scale = 5;
  canvas.width = canvasWidth*scale;
  canvas.height = canvasHeight*scale;
  ctx.lineWidth *= scale;
}


function draw(){
  let yMax= canvas.height;
  let xMax= canvas.width
  let dx=1; let dt=0.001;
  let y=0; let x=0; let t=0;
  let curveLength=0;
  
  ctx.beginPath();
  ctx.moveTo(0,0)
  for(let i=0; i<xMax; i+=dx){
    //draw line
    x= i;
    y= scaledNoise1D(t, 0, yMax);
    ctx.lineTo(x, y);
    
    //increment to curve length
    let dy=scaledNoise1D(t+dt, 0, yMax)-y;
    let slopeLength= Math.sqrt((dy*dy)+(dx*dx));
    curveLength+=slopeLength;
    
    //increment dt
    t+=dt
  }
  ctx.stroke();
  //console.log(curveLength)
}


let dx=1; let dt=0.001;
let y=0; let x=0; let t=0;
let lengthOfCurve=0;

function curveLength(){
  let length=0;
  for(let i=0; i<xMax; i+=dx){
    y= scaledNoise1D(t, 0, yMax);
    let dy=scaledNoise1D(t+dt, 0, yMax)-y;
    let slopeLength= Math.sqrt((dy*dy)+(dx*dx));
    length+=slopeLength;
    
    //increment dt
    t+=dt
  }
  return length;
}


function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height)
  draw();
  if(x==0){ lengthOfCurve = curveLength(); console.log(lengthOfCurve)}
  
  y= scaledNoise1D(t, 0, yMax);
  ctx.beginPath()
  ctx.rect(x,y, 50, 50)
  ctx.fill();
  
  x+=dx; t+=dt;
  
  requestAnimationFrame(animate);
}

function render(){
  resizeCanvas();
  draw();
}

//...initial render
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
render();
/** section end **/

//eventListeners

//...resize eventListener
window.addEventListener("resize", ()=>{
  render();
});
/** section end **/

console.log(canvas.width);
let yMax= canvas.height
let xMax= canvas.width
animate()