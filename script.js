import {createNoise2D} from './simplex-noise.min.js';

//classes
class SpatialPoint{
  constructor(x, y, z, distanceFromPrevPoint, dx=1, dy=1, dz=1){
    this.x= x;
    this.y= y;
    this.z= z;
    this.distanceFromPrevPoint= distanceFromPrevPoint;
    this.dx= dx;
    this.dy= dy;
    this.dz= dz;
  }
}

class RenderPoint{
  constructor(x, y, dx=1, dy=1){
    this.x= x;
    this.y= y;
    this.dx= dx;
    this.dy= dy;
  }
}

//every square object from this class will have initial 3D coordinates specified by the spatialPoint object, the axis points are parametric functions of time. as time progresses the x and z coordinates trace an inward/collapsing orbit around the plane center and y coordinate is determined by a noise function that is unique to every instance of square where the range of y steadily shrinks to 0 proportional to the rate of orbit collapse.
class Square{
  constructor(spatialPoint, width, height, dAngleAlongOrbit=Math.PI/5, numOfOrbitsToCenter=3){
    this.spatialPoint= spatialPoint;
    this.renderPoint= new RenderPoint();
    this.width= width;
    this.height= height;
    this.dAngleAlongOrbit= dAngleAlongOrbit/framePerSecond;
    //dAngleAlongOrbit must be in rad and it is per second (60 frames ≈ 1 second). During property assignment above, it is converted to be per frame.
    this.numOfOrbitsToCenter=numOfOrbitsToCenter;
    this.noise2D = createNoise2D(prng);
    this.initNoiseRange= canvas.height
    this.currentNoiseRange= canvas.height; //noise range is for the y-axis
    // the following must be derived on inistantiation of the object
    this.numOfStepsToCenter= 0;
    this.currentOrbitAngle= 0;
    this.initOrbitAngle= 0;
    this.currentOrbitRadius= 0;
    this.dOrbitRadius= 0;
    this.dNoiseRange= 0;
    this.pointsOnPath= [];
  }
  scaledNoise1D(t, min, max){
    const noise1D=(t)=>{ return this.noise2D(t, 0)}
    const n = noise1D(t);      // [-1, 1]
    return min + ((n+1)/2) * (max-min);
  }
  orbitAngle(t){
    return this.initOrbitAngle+(this.dAngleAlongOrbit*(t/dTime));
  }
  zCoordinate(t){
    return midSpaceDepth+(this.currentOrbitRadius * Math.sin(this.orbitAngle(t)) );
  }
  xCoordinate(t){
    return midSpaceWidth+(this.currentOrbitRadius * Math.cos(this.orbitAngle(t)) );
  }
  yCoordinate(t, min, max){
    return this.scaledNoise1D(t, min, max);
  }
  computePointsOnPath(){
    //derive radius
    let xCenter= midSpaceWidth;
    let zCenter= midSpaceDepth;
    let xDiff= this.spatialPoint.x-xCenter;
    let zDiff= this.spatialPoint.z-zCenter;
    this.currentOrbitRadius= Math.sqrt((xDiff*xDiff)+(zDiff+zDiff));
    
    //derive current angle on x,z plane
    let angle= Math.atan2(zDiff, xDiff);
    this.currentOrbitAngle= (angle<0)?angle+ 2*Math.PI: angle;
    this.initOrbitAngle= this.currentOrbitAngle;
    
    //derive numOfStepsToCenter
    this.numOfStepsToCenter= ((2*Math.PI)/this.dAngleAlongOrbit)*this.numOfOrbitsToCenter;
    
    //derive dOrbitRadius and dNoiseRange
    this.dOrbitRadius= (-this.currentOrbitRadius)/(this.numOfStepsToCenter-1);
    this.dNoiseRange= (-this.currentNoiseRange)/(this.numOfStepsToCenter-1);
    
    this.pointsOnPath.push(this.spatialPoint)
    let t=0;
    for(let i=0; i<this.numOfStepsToCenter; i++){
      t+=dTime;
      this.currentOrbitRadius+=this.dOrbitRadius;
      this.currentNoiseRange+=this.dNoiseRange;
      let rangeDiff= this.initNoiseRange-this.currentNoiseRange;
      let min= rangeDiff/2;
      let max= this.initNoiseRange-min;
      
      let z= this.zCoordinate(t);
      let x= this.xCoordinate(t);
      let y= this.yCoordinate(t, min, max);
      let zDiff= this.zCoordinate(t-dTime)- z;
      let xDiff= this.xCoordinate(t-dTime)- x;
      let yDiff= this.yCoordinate(t-dTime, min, max)- y;
      this.pointsOnPath.push(new SpatialPoint(x, y, z, Math.sqrt((xDiff*xDiff)+(yDiff*yDiff)+(zDiff*zDiff)) ));
      
    }
    
  }
  updateRenderParameters(x, y, z){
    this.spatialPoint.x= x;
    this.spatialPoint.y= y;
    this.spatialPoint.z= z;
    
    let xDistanceFromCenter= this.spatialPoint.x - midSpaceWidth;
    let yDistanceFromCenter= this.spatialPoint.y - midSpaceHeight;
    let triangleHeight= this.spatialPoint.z + viewerDistance;
    let height_BaseX_ratio= triangleHeight/xDistanceFromCenter;
    let height_BaseY_ratio= triangleHeight/yDistanceFromCenter;
    let renderXFromCenter= viewerDistance/height_BaseX_ratio;
    let renderYFromCenter= viewerDistance/height_BaseY_ratio;
    
    this.renderPoint.x= midSpaceWidth+renderXFromCenter;
    this.renderPoint.y= midSpaceHeight+renderYFromCenter;
    
    //update speed
    let renderSpaceWidth= (viewerDistance/(triangleHeight/midSpaceWidth))*2;
    let renderSpaceHeight= (viewerDistance/(triangleHeight/midSpaceHeight))*2;
    
    this.renderPoint.dx= (this.spatialPoint.dx*renderSpaceWidth)/maxSpaceWidth;
    this.renderPoint.dy= (this.spatialPoint.dy*renderSpaceHeight)/maxSpaceHeight;
    
    //update width and height
    this.width= (this.width*renderSpaceWidth)/maxSpaceWidth;
    this.height= (this.height*renderSpaceHeight)/maxSpaceHeight;
    
  }
  draw(){
    this.updateRenderParameters(this.spatialPoint.x, this.spatialPoint.y, this.spatialPoint.z)
    ctx.beginPath();
    ctx.rect(this.renderPoint.x, this.renderPoint.y, this.width, this.height);
    ctx.stroke();
    console.log(this.pointsOnPath)
    ctx.beginPath();
    ctx.moveTo(this.pointsOnPath[0].x, this.pointsOnPath[0].y);
    for(let i=0; i<this.pointsOnPath.length; i++){
      ctx.lineTo(this.pointsOnPath[i].x, this.pointsOnPath[i].y);
    }
    ctx.stroke();
  }
}
/** section end **/

//global variables
let viewerDistance;
let maxSpaceDepth;
let maxSpaceWidth;
let maxSpaceHeight;
let midSpaceDepth;
let midSpaceWidth;
let midSpaceHeight;

let squareWidth;
let squareHeight;

const dTime= 0.01
const currentTime= 0.03;
const framePerSecond= 60;
/** section end **/

//functions
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
}//functEnd

const seededRandom=(seed)=>{
  // ensure seed is a positive integer
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;

  return function() {
    value = (value * 16807) % 2147483647;
    return value / 2147483647; // returns [0, 1)
  };
}//functEnd
const prng= seededRandom(3);

function drawDepth(){
  let triangleHeight= maxSpaceDepth + viewerDistance;
  let height_BaseX_ratio= triangleHeight/midSpaceWidth;
  let height_BaseY_ratio= triangleHeight/midSpaceHeight;
  let renderXFromCenter= viewerDistance/height_BaseX_ratio;
  let renderYFromCenter= viewerDistance/height_BaseY_ratio;
  
  let backPlaneX= midSpaceWidth-renderXFromCenter;
  let backPlaneY= midSpaceHeight-renderYFromCenter;
  
  ctx.beginPath();
  ctx.rect(backPlaneX, backPlaneY, (renderXFromCenter*2), (renderYFromCenter*2));
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(backPlaneX, backPlaneY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(canvas.width, 0);
  ctx.lineTo(backPlaneX+(renderXFromCenter*2), backPlaneY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(backPlaneX, backPlaneY+(renderYFromCenter*2));
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(canvas.width, canvas.height);
  ctx.lineTo(backPlaneX+(renderXFromCenter*2), backPlaneY+(renderYFromCenter*2));
  ctx.stroke();
}

function draw(){
  //The following global variables are primarily used by this function they must be updated everytime the resizeCanvas function is called because they depend on the current canvas dimensions
  maxSpaceWidth= canvas.width;
  maxSpaceHeight= canvas.height;
  midSpaceWidth= maxSpaceWidth/2;
  midSpaceHeight= maxSpaceHeight/2;
  
  viewerDistance= canvas.width*0.5;
  maxSpaceDepth= canvas.width;
  midSpaceDepth= maxSpaceDepth/2;
  squareWidth= canvas.width*0.3;
  squareHeight= canvas.height*0.3;
  
  drawDepth()
  
  //test
  let newSpatialPoint= new SpatialPoint(canvas.width*0.9, canvas.height/2, maxSpaceDepth*1)
  let newSquare= new Square(newSpatialPoint, squareWidth, squareHeight);
  newSquare.computePointsOnPath()
  newSquare.draw();
  console.log(newSquare.scaledNoise1D(currentTime, 0, canvas.height));
  console.log(newSquare.pointsOnPath)
  
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
