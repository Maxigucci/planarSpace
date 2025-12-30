import {createNoise2D} from './simplex-noise.min.js';

//classes
class SpatialPoint{
  constructor(x, y, z, distanceFromPrevPoint=0){
    this.x= x;
    this.y= y;
    this.z= z;
    this.distanceFromPrevPoint= distanceFromPrevPoint;
  }
}

class RenderPoint{
  constructor(x, y){
    this.x= x;
    this.y= y;
  }
}

//every square object from this class will have initial 3D coordinates that will be determined using orbit radius on x,z plane and initail angle on the same plane to derive the spatial point, the axis points are parametric functions of time. as time progresses the x and z coordinates trace an inward/collapsing orbit around the plane center and y coordinate is determined by a noise function that is unique to every instance of square where the range of y steadily shrinks to 0 proportional to the rate of orbit collapse.
class Square{
  constructor(currentOrbitRadius, initOrbitAngle, width, height, dAngleAlongOrbit=Math.PI/5, numOfOrbitsToCenter=5){
    
    this.currentOrbitRadius= currentOrbitRadius;
    this.initOrbitAngle= initOrbitAngle;
    this.width= width;
    this.height= height;
    this.radius= (this.width<this.height)? this.width: this.height; //this class is meant to be a template for a square object but i will add this parameter incase i want to draw a circle at its coordinates
    this.dAngleAlongOrbit= dAngleAlongOrbit/framePerSecond;
    //dAngleAlongOrbit must be in rad and it is per second (60 frames ≈ 1 second). During property assignment above, it is converted to be per frame.
    this.numOfOrbitsToCenter=numOfOrbitsToCenter;
    this.noise2D = createNoise2D(prng);
    this.initNoiseRange= canvas.height
    this.currentNoiseRange= canvas.height; //noise range is for the y-axis
    
    // the following will be derived on inistantiation of the object
    this.numOfStepsToCenter= 0;
    this.dOrbitRadius= 0;
    this.dNoiseRange= 0;
    //Curve in the following refers to the path the square will take in 3D space. it is precomputed as points in pointsAlongPath array
    this.curveLength= 0;
    this.speedAlongCurve= 0;
    this.currentDistanceAlongCurve= 0;
    this.pointsOnPath= [];
    
    this.spatialPoint= this.initSpatialPoint();
    this.renderPoint= new RenderPoint();
    
    this.computePointsOnPath();
    this.updateRenderParameters()
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
  initSpatialPoint(){
    //this function returns the initial spatialPoint of the square based on distance/radius from center and angle along the circle
    
    let t= 0; //initial time
    let x= this.xCoordinate(t);
    let z= this.zCoordinate(t);
    let y= this.yCoordinate(t, 0, canvas.height);
    
    return new SpatialPoint(x, y, z)
  }
  computePointsOnPath(){
    //derive numOfStepsToCenter
    this.numOfStepsToCenter= ((2*Math.PI)/this.dAngleAlongOrbit)*this.numOfOrbitsToCenter;
    
    //derive dOrbitRadius and dNoiseRange
    this.dOrbitRadius= (-this.currentOrbitRadius)/(this.numOfStepsToCenter-1);
    this.dNoiseRange= (-this.currentNoiseRange)/(this.numOfStepsToCenter-1);
    
    let t=0;
    for(let i=0; i<this.numOfStepsToCenter; i++){
      let rangeDiff= this.initNoiseRange-this.currentNoiseRange;
      let min= rangeDiff/2;
      let max= this.initNoiseRange-min;
      
      let z= this.zCoordinate(t);
      let x= this.xCoordinate(t);
      let y= this.yCoordinate(t, min, max);
      let zDiff= (t > 0)?this.zCoordinate(t-dTime)- z: 0;
      let xDiff= (t > 0)?this.xCoordinate(t-dTime)- x: 0;
      let yDiff= (t > 0)?this.yCoordinate(t-dTime, min, max)- y: 0;
      let distanceFromPrevPoint= Math.sqrt((xDiff*xDiff)+(yDiff*yDiff)+(zDiff*zDiff))
      this.curveLength+= distanceFromPrevPoint;
      this.pointsOnPath.push(new SpatialPoint(x, y, z, distanceFromPrevPoint) );
      
      t+=dTime;
      this.currentOrbitRadius+=this.dOrbitRadius;
      this.currentNoiseRange+=this.dNoiseRange;
      
    }
    this.speedAlongCurve= this.curveLength/(30*framePerSecond);
    
  }
  updateRenderParameters(){
    // the render parameters are the x and y coordinates on the screen as well as the width and height OR radius at various depths
    
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
    console.log(renderSpaceWidth)
    
    //update width and height
    this.width= (squareWidth*renderSpaceWidth)/maxSpaceWidth;
    this.height= (squareHeight*renderSpaceHeight)/maxSpaceHeight;
    
    /**
    this.renderPoint.dx= (this.spatialPoint.dx*renderSpaceWidth)/maxSpaceWidth;
    this.renderPoint.dy= (this.spatialPoint.dy*renderSpaceHeight)/maxSpaceHeight;
    **/
    
  }
  draw(){
    
    ctx.beginPath();
    ctx.rect(this.renderPoint.x, this.renderPoint.y, this.width, this.height);
    ctx.stroke();
    
    /**
    //test: draw path
    ctx.beginPath();
    ctx.moveTo(this.pointsOnPath[0].x, this.pointsOnPath[0].y);
    for(let i=0; i<this.pointsOnPath.length; i++){
      ctx.lineTo(this.pointsOnPath[i].x, this.pointsOnPath[i].y);
    }
    ctx.stroke();
    **/
  }
  
  updateSpatialPoint(){
    this.currentDistanceAlongCurve+= this.speedAlongCurve;
    
    
    //these are distances from 0 to points along the path 
    let distanceAtCurrentPoint= 0;
    let distanceAtPrevPoint= 0;
    
    
    
    this.pointsOnPath.some((currentPoint, index, array)=>{
      if(distanceAtCurrentPoint < this.currentDistanceAlongCurve){
        //console.log("less than")
        distanceAtPrevPoint= distanceAtCurrentPoint;
        distanceAtCurrentPoint+= currentPoint.distanceFromPrevPoint;
        //console.log("less than")
      }else if(distanceAtCurrentPoint > this.currentDistanceAlongCurve){
        //console.log("finalyGreater")
        let segmentRatio= (this.currentDistanceAlongCurve - distanceAtPrevPoint)/(distanceAtCurrentPoint - distanceAtPrevPoint);
        let prevPoint= array[index-1];
        //console.log(prevPoint)
        this.spatialPoint.x= prevPoint.x+ (segmentRatio+(currentPoint.x- prevPoint.x));
        this.spatialPoint.y= prevPoint.y+ (segmentRatio+(currentPoint.y- prevPoint.y));
        this.spatialPoint.z= prevPoint.z+ (segmentRatio+(currentPoint.z- prevPoint.z));
        
        return true;
      }else{
        //console.log("equal")
        this.spatialPoint.x= currentPoint.x;
        this.spatialPoint.y= currentPoint.y;
        this.spatialPoint.z= currentPoint.z;
        return true;
      }
    })
  }
  moveAlongPath(){
    this.updateSpatialPoint();
    console.log(this.spatialPoint)
    this.updateRenderParameters();
    console.log(this.renderPoint)
    console.log(this.width)
    this.draw();
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

const dTime= 0.001
const currentTime= 0.9;
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

function updateDrawingVariables(){
  //this is whete we update the variables that depend on the dimensions of the canvas. this function will be called everytime the canvas is resized
  
  maxSpaceWidth= canvas.width;
  maxSpaceHeight= canvas.height;
  midSpaceWidth= maxSpaceWidth/2;
  midSpaceHeight= maxSpaceHeight/2;
  
  viewerDistance= canvas.width*0.5;
  maxSpaceDepth= canvas.width;
  midSpaceDepth= maxSpaceDepth/2;
  squareWidth= canvas.width*0.1;
  squareHeight= canvas.height*0.1;
}

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

function animate(newSquare){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  drawDepth();
  newSquare.moveAlongPath();
  
  
  
  requestAnimationFrame(()=> animate(newSquare));
  //newSquare.draw();
  //console.log(newSquare.scaledNoise1D(currentTime, 0, canvas.height));
  //console.log(newSquare.pointsOnPath);
  
}

function render(){
  resizeCanvas();
  updateDrawingVariables();
  let newSquare= new Square(canvas.width/2, Math.PI, squareWidth, squareHeight);
  //console.log(newSquare.pointsOnPath)
  animate(newSquare);
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
