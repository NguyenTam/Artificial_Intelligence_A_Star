/*
  Authors:
  Nguyen       Tam
  Johansson    Alex
  Dutruit      Jérémie
  Stenroth     Johan

Date: 05 April 2014.
*/
/********************************************************************************
Global Variables
********************************************************************************/
var c = document.getElementById("mazecanvas");
var crobot = document.getElementById("robotmazecanvas");
var ctx = c.getContext("2d");
var ctxrobot = crobot.getContext("2d");
var maze = [];
var robotMaze = [];
var prob = document.getElementById("prob").value;
var x = document.getElementById("x").value;
var y = document.getElementById("y").value;
var sensor_range = document.getElementById("sensor_range").value;
var cellW = c.width / x;
var cellH = c.height / y;
var startX = Math.floor(Math.random() * x);
var startY = Math.floor(Math.random() * y);
var endX = Math.floor(Math.random() * x);
var endY = Math.floor(Math.random() * y);

var timer;
var globalTimerCheck = 0;
var globalShowPath = true;
var genMazeButton = document.getElementById("genMazeButton");
var myText = document.getElementById("helloText");
var robotHit = false;
var goalHit = false;
var calculatedMouseX;
var calculatedMouseY;

var robotCurrentX = null;
var robotCurrentY = null;
var data = null;
var result = null;
var reachGoal = 0;
var timeoutFlag = false;

// drawing
var isDragged = false;
var globalCalculateForward = false;

var pauseButton = document.getElementById("pauseButton");
var showPathButton = document.getElementById("showPathButton");

var mouseMoving = function updateCursorLocation(e) { /*Calculates and updates current cursor location to global variables*/
        var currentElement = c;
        var totalOffsetX = 0;
        var totalOffsetY = 0;

        do {
            totalOffsetX = totalOffsetX + currentElement.offsetLeft - currentElement.scrollLeft;
            totalOffsetY = totalOffsetY + currentElement.offsetTop - currentElement.scrollTop;
        } while (currentElement = currentElement.offsetParent);

        calculatedMouseX = e.pageX - totalOffsetX;
        calculatedMouseY = e.pageY - totalOffsetY;
    }

/********************************************************************************
Functions
********************************************************************************/
/*
  Create a maze based on user's inputs. "generate"-button click will invoke this function.
*/

function createMaze () {
    // create the maze
    if (timer) {
        clearInterval(timer);
    }
    myText.textContent = "Searching for beacon...";
    // randomization
    prob = document.getElementById("prob").value;
    x = document.getElementById("x").value;
    y = document.getElementById("y").value;
    sensor_range = document.getElementById("sensor_range").value;
    cellW = c.width / x; //cell width
    cellH = c.height / y; //cell height
    maze = [];
    robotMaze = [];
    var j;
    for (j = 0; x > j; j += 1) {
        robotMaze[j] = new Array();
        maze[j] = new Array();
    }
    // succesfully initialized array for maze
    //initialize maze and robotMaze.
    var i, j;
    for (i = 0; i < x; i += 1) {
        for (j = 0; j < y; j += 1) {
            maze[i][j] = {
                wall: Math.random() < prob
            };
            robotMaze[i][j] = {
                wall: false,
                seen: false
            };
        }
    }

    generateStartEnd();
    robotCurrentX = startX;
    robotCurrentY = startY;

    robotMaze[robotCurrentX][robotCurrentY].seen = true;
    seeNorthNeighbours([robotCurrentX, robotCurrentY]);
    seeSouthNeighbours([robotCurrentX, robotCurrentY]);
    seeEastNeighbours([robotCurrentX, robotCurrentY]);
    seeWestNeighbours([robotCurrentX, robotCurrentY]);
    result = null;
    reachGoal = 0;
    calculatePath();
    drawMaze();
    globalTimerCheck = 0;

    //Solution for javascript to draw environment changes at the initial state.
    pauseButton.click();
    pauseButton.click();
}

function drawMazePlus() {

    calculatePath();
    drawMaze();

    if (!robotHit && !goalHit) {
        initAStar();
    }

    calculatePath();
    drawMaze();
}

function drawMaze() {
    sensor_range = document.getElementById("sensor_range").value;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = (prob < 0.5) ? "#FFF" : "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = (prob < 0.5) ? "#000" : "#FFF";

    ctxrobot.clearRect(0, 0, c.width, c.height);
    ctxrobot.fillStyle = "#FFF";
    ctxrobot.fillRect(0, 0, c.width, c.height);

    var i, j;
    for (i = 0; i < x; i += 1) {
        for (j = 0; j < y; j += 1) {
            if ((maze[i][j].wall && (prob < 0.5)) || (!maze[i][j].wall && (prob >= 0.5))) {
                ctx.fillRect(i * cellW, j * cellH, cellW, cellH);
            }

            if (!robotMaze[i][j].seen) {
                ctxrobot.fillStyle = "#555";
                ctxrobot.fillRect(i * cellW, j * cellH, cellW, cellH);
            } else {
                if (robotMaze[i][j].wall) {
                    ctxrobot.fillStyle = "#000";
                    ctxrobot.fillRect(i * cellW, j * cellH, cellW, cellH);
                }
            }
        }
    }


    if (reachGoal == 1) {
        myText.textContent = "Found beacon!";
    } else if (reachGoal == 0) {
        myText.textContent = "Searching for beacon...";
    } else {
        myText.textContent = "No path to beacon !!!!";
    }


    //drawing end place
    ctx.fillStyle = "green";
    ctxrobot.fillStyle = "green";
    if (goalHit) {
        //updateCursorLocation();
        ctx.fillRect(calculatedMouseX - (cellW / 2), calculatedMouseY - (cellH / 2), cellW, cellH);
        ctxrobot.fillRect(calculatedMouseX - (cellW / 2), calculatedMouseY - (cellH / 2), cellW, cellH);
    } else {
        ctx.fillRect(endX * cellW, endY * cellH, cellW, cellH);
        ctxrobot.fillRect(endX * cellW, endY * cellH, cellW, cellH);
    }

    //draw path
    if (result && result.path.length > 1 && globalShowPath) {
        ctxrobot.beginPath();
        ctxrobot.moveTo(result.path[0][0] * cellW + (cellW / 2), result.path[0][1] * cellH + (cellH / 2));

        var i;
        for (i = 1; i < result.path.length; i += 1) {
            ctxrobot.lineTo(result.path[i][0] * cellW + (cellW / 2), result.path[i][1] * cellH + (cellH / 2));
        }
        ctxrobot.strokeStyle = "orange";
        ctxrobot.stroke();
    }

    //drawing robot
    ctx.fillStyle = "red";
    ctxrobot.fillStyle = "red";
    //Draw ellipse only
    if (robotHit) {
        //updateCursorLocation();
        ellipse(ctx, calculatedMouseX, calculatedMouseY, cellW / 2, cellH / 2);
        ellipse(ctxrobot, robotCurrentX * cellW + (cellW / 2), robotCurrentY * cellH + (cellH / 2), cellW / 2, cellH / 2);
    } else {
        ellipse(ctx, robotCurrentX * cellW + (cellW / 2), robotCurrentY * cellH + (cellH / 2), cellW / 2, cellH / 2);
        ellipse(ctxrobot, robotCurrentX * cellW + (cellW / 2), robotCurrentY * cellH + (cellH / 2), cellW / 2, cellH / 2);
    }

}

function blockCenterPixelPositionsOnCanvas(block) {
    return [block[0] * cellW + (cellW / 2)][block[1] * cellH + (cellH / 2)]
}

/* http://stackoverflow.com/a/8372834 */

function ellipse(context, cx, cy, rx, ry) {
    context.save(); // save state
    context.beginPath();

    context.translate(cx - rx, cy - ry);
    context.scale(rx, ry);
    context.arc(1, 1, 1, 0, 2 * Math.PI, false);

    context.restore(); // restore to original state
    context.fill();
} /* code from stackoverflow ends */

function generateStartEnd() {
    startX = Math.floor(Math.random() * x);
    startY = Math.floor(Math.random() * y);
    maze[startX][startY].wall = false;
    endX = Math.floor(Math.random() * x);
    endY = Math.floor(Math.random() * y);
    maze[endX][endY].wall = false;
}

function canvasMouseOffsets(event) {
    mouseMoving(event);

    //define if hits the start position/robot
    var hit = ((calculatedMouseX / cellW >= robotCurrentX && calculatedMouseX / cellW < (robotCurrentX + 1)) &&
        (calculatedMouseY / cellH >= robotCurrentY && calculatedMouseY / cellH < (robotCurrentY + 1)));

    if (hit) {
        robotHit = true;

    } else {
        var currentX = Math.min(Math.floor(calculatedMouseX / cellW), x - 1);
        var currentY = Math.min(Math.floor(calculatedMouseY / cellH), y - 1);
        var hitEnd = (currentX == endX) && (currentY == endY);
        if (hitEnd) {
            goalHit = true;
            //move the place of the end thingie
        } else {
            //change color/wall of background       
            maze[currentX][currentY].wall = !maze[currentX][currentY].wall;
        }
    }
}

function stopTimers() {
    if (timer) {
        clearInterval(timer);
    }
}

function pauseTimers() {
    if (globalTimerCheck == 0) {
        clearInterval(timer);
        timer = setInterval(drawMazePlus, 400);
        globalCalculateForward = true;
        globalTimerCheck = 1;
    } else {
        clearInterval(timer);
        seeNeighbours();
        timer = setInterval(drawMaze, 400);
        globalCalculateForward = false;
        globalTimerCheck = 0;
    }

}

function showPath() {
    globalShowPath = !globalShowPath;
    calculatePath();
    drawMaze();
}


function initAStar() {

    calculatePath(); //this also call AStar-algorithm. AStar define value of result (below, in if-statement).
    if (result) {
        reachGoal = 0;
        var currentPos = result.path[0];
        var newPos = null;
        var action = "";
        if (result.path.length > 1) {
            newPos = result.path[1];
            action = getControl(currentPos, newPos);
            robotAction(action);
        } else {
            if (samePosition(currentPos, [endX, endY])) {
                reachGoal = 1;
            } else {
                reachGoal = -1;
            }
        }
    } else {
        reachGoal = -1;
    }

    if (reachGoal == -1) {
        var i, j;
        for (i = 0; i < x; i += 1) {
            for (j = 0; j < y; j += 1) {
                robotMaze[i][j].seen = false;
                robotMaze[i][j].wall = false;
            }
        }
        reachGoal = 0;
    }
    seeNeighbours();
}

function calculatePath() {

    data = null;
    data = [{
        path_cost: 0,
        path: [
            [robotCurrentX, robotCurrentY]
        ],
        neighbours: []
    }];
/*
      initialize data variable, get neighours of at the starting point.
    */
    data[0].neighbours = getNeighbours(data[0].path, [robotCurrentX, robotCurrentY]);
    if (data[0].neighbours.length == 0 || samePosition([robotCurrentX, robotCurrentY], [endX, endY])) {
        result = data[0];
    } else {
        result = AStar();
    }

}



/*
  A-Star algorithm. Return a node that possible lead to the goal. Return null if goal is unreachable.
  
  Data structures: node = {path_cost, path, neighbours}. data = [node1, node2, node3, ...]
  Example of a node:
       path_cost : 2
       path      : [[0,0],[0,1],[0,2]]. start from [0,0] and moved two times to South.
       neighbours: [[0,3],[1,2]]. Neighbours of [0,2] (previous line), assuming [0,3] and [1,2] are not wall. Neighbours = Frontiers
*/

function AStar() {

    var node = null;
    var list_visited = [];
    while (data.length > 0) {

        //remove all frontiers that is in visited list and possible paths leading to deadend.
        var i, j;
        for (i = 0; i < data.length; i += 1) {
            for (j = 0; j < data[i].neighbours.length; j += 1) {
                //Remove neighbours that are in visited list
                if (visited(list_visited, data[i].neighbours[j])) {
                    data[i].neighbours.splice(j, 1);
                    //If frontier is zero of data[i].path, means data[i].path can not go any further. Therefore remove data[i]
                    if (data[i].neighbours.length == 0) {
                        data.splice(i, 1);
                        i -= 1;
                        break;
                    }
                    j -= 1;
                    continue;
                }
            }
        }

        /*All data examined, terminate while-loop normally.*/
        if (data.length == 0) {
            continue;
        }

        var minimumCost = Infinity;
        var minimumCostI = -1; // index of the node to start.
        var minimumCostJ = -1; // the frontier/neighbour to take, index of it.
        // Get the neighbour that lead to cheapest cost.
        var F = null; // F = G + H
        for (i = data.length - 1; i >= 0; i -= 1) {
            for (j = data[i].neighbours.length - 1; j >= 0; j -= 1) {
                F = getG(data[i].path_cost) + getH(data[i].neighbours[j]);
                if (F < minimumCost) {
                    minimumCost = F;
                    minimumCostI = i;
                    minimumCostJ = j;
                }
            }
        }
        node = data[minimumCostI]; // the node to start from.
        //If node is the goal then path was found, return this node.
        if (samePosition(node.neighbours[minimumCostJ], [endX, endY])) {
            node.path_cost = minimumCost;
            node.path.push([endX, endY]);
            //neighbours is not important, because got the final destination.
            return node;
        }
        //node is not the goal.
        else {
            //Get the frontier that the robot visits next.
            var neighbourPos = node.neighbours[minimumCostJ];

            //New frontier taken, so now update path cost
            var newPathCost = minimumCost - getH(neighbourPos);

            //copy the path and add taken frontier to this newPath
            var newPath = node.path.slice(0);
            newPath.push([neighbourPos[0], neighbourPos[1]]);

            //add the frontier as visited
            list_visited.push([neighbourPos[0], neighbourPos[1]]);

            //Get new frontiers of newPath and add it to the data-list
            var newNeighbours = getNeighbours(list_visited, neighbourPos);
            if (newNeighbours.length > 0) {
                data.push({
                    path_cost: newPathCost,
                    path: newPath,
                    neighbours: newNeighbours
                });
            }
        }

    }
    return null;
}


function getH(position) {
    return Math.abs(endX - position[0]) + Math.abs(endY - position[1]);
}

function getG(currentCost) {
    var movementCost = 1; //every direction cost one
    return currentCost + movementCost;
}

function getNeighbours(path, position) {
    var neighbours = [];

    var tmp = null;
    tmp = getNorthNeighbour(position);
    if (tmp.length > 0 && !visited(path, tmp)) {
        neighbours.push(tmp);
    }
    tmp = getWestNeighbour(position);
    if (tmp.length > 0 && !visited(path, tmp)) {
        neighbours.push(tmp);
    }
    tmp = getSouthNeighbour(position);
    if (tmp.length > 0 && !visited(path, tmp)) {
        neighbours.push(tmp);
    }

    tmp = getEastNeighbour(position);
    if (tmp.length > 0 && !visited(path, tmp)) {
        neighbours.push(tmp);
    }
    return neighbours;
}


function getNorthNeighbour(position) {
    if (robotMaze.length && (position[1] > 0) && !robotMaze[position[0]][position[1] - 1].wall) {
        return [position[0], position[1] - 1];
    } else {
        return [];
    }
}

function getSouthNeighbour(position) {
    if (robotMaze.length && (position[1] < (y - 1)) && !robotMaze[position[0]][position[1] + 1].wall) {
        return [position[0], position[1] + 1];
    } else {
        return [];
    }
}

function getWestNeighbour(position) {
    if (robotMaze.length && (position[0] > 0) && !robotMaze[position[0] - 1][position[1]].wall) {
        return [position[0] - 1, position[1]];
    } else {
        return [];
    }
}

function getEastNeighbour(position) {
    if (robotMaze.length && (position[0] < (x - 1)) && !robotMaze[position[0] + 1][position[1]].wall) {
        return [position[0] + 1, position[1]];
    } else {
        return [];
    }
}

function seeNeighbours() {
    robotMaze[robotCurrentX][robotCurrentY].seen = true;
    seeNorthNeighbours([robotCurrentX, robotCurrentY]);
    seeSouthNeighbours([robotCurrentX, robotCurrentY]);
    seeEastNeighbours([robotCurrentX, robotCurrentY]);
    seeWestNeighbours([robotCurrentX, robotCurrentY]);
}

function seeNorthNeighbours(position) {
    var i = 1;
    while (maze.length && (position[1] > 0) && (position[1] - i > -1) && !maze[position[0]][position[1] - i].wall && i <= sensor_range) {
        robotMaze[position[0]][position[1] - i].seen = true;
        robotMaze[position[0]][position[1] - i].wall = false;
        if (position[0] - 1 > -1) {
            robotMaze[position[0] - 1][position[1] - i].seen = true;
            robotMaze[position[0] - 1][position[1] - i].wall = maze[position[0] - 1][position[1] - i].wall;
        }
        if (position[0] + 1 < (x)) {
            robotMaze[position[0] + 1][position[1] - i].seen = true;
            robotMaze[position[0] + 1][position[1] - i].wall = maze[position[0] + 1][position[1] - i].wall;
        }
        i += 1;
    }
    if (maze.length && (position[1] > 0) && (position[1] - i > -1) && i <= sensor_range) {
        robotMaze[position[0]][position[1] - i].seen = true;
        robotMaze[position[0]][position[1] - i].wall = true;
    }
}

function seeSouthNeighbours(position) {
    var i = 1;
    while (maze.length && (position[1] < (y - 1)) && (position[1] + i < y) && !maze[position[0]][position[1] + i].wall && i <= sensor_range) {
        robotMaze[position[0]][position[1] + i].seen = true;
        robotMaze[position[0]][position[1] + i].wall = false;
        if (position[0] - 1 > -1) {
            robotMaze[position[0] - 1][position[1] + i].seen = true;
            robotMaze[position[0] - 1][position[1] + i].wall = maze[position[0] - 1][position[1] + i].wall;
        }
        if (position[0] + 1 < (x)) {
            robotMaze[position[0] + 1][position[1] + i].seen = true;
            robotMaze[position[0] + 1][position[1] + i].wall = maze[position[0] + 1][position[1] + i].wall;
        }
        i += 1;
    }
    if (maze.length && (position[1] < (y - 1)) && (position[1] + i < y) && i <= sensor_range) {
        robotMaze[position[0]][position[1] + i].seen = true;
        robotMaze[position[0]][position[1] + i].wall = true;
    }
}

function seeWestNeighbours(position) {
    var i = 1;
    while (maze.length && (position[0] > 0) && (position[0] - i > -1) && !maze[position[0] - i][position[1]].wall && i <= sensor_range) {
        robotMaze[position[0] - i][position[1]].seen = true;
        robotMaze[position[0] - i][position[1]].wall = false;
        if (position[1] - 1 > -1) {
            robotMaze[position[0] - i][position[1] - 1].seen = true;
            robotMaze[position[0] - i][position[1] - 1].wall = maze[position[0] - i][position[1] - 1].wall;
        }
        if (position[1] + 1 < (y)) {
            robotMaze[position[0] - i][position[1] + 1].seen = true;
            robotMaze[position[0] - i][position[1] + 1].wall = maze[position[0] - i][position[1] + 1].wall;
        }
        i += 1;
    }
    if (maze.length && (position[0] > 0) && (position[0] - i > -1) && i <= sensor_range) {
        robotMaze[position[0] - i][position[1]].seen = true;
        robotMaze[position[0] - i][position[1]].wall = true;
    }
}

function seeEastNeighbours(position) {
    var i = 1;
    while (maze.length && (position[0] < (x - 1)) && (position[0] + i < x) && !maze[position[0] + i][position[1]].wall && i <= sensor_range) {
        robotMaze[position[0] + i][position[1]].seen = true;
        robotMaze[position[0] + i][position[1]].wall = false;
        if (position[1] - 1 > -1) {
            robotMaze[position[0] + i][position[1] - 1].seen = true;
            robotMaze[position[0] + i][position[1] - 1].wall = maze[position[0] + i][position[1] - 1].wall;
        }
        if (position[1] + 1 < (y)) {
            robotMaze[position[0] + i][position[1] + 1].seen = true;
            robotMaze[position[0] + i][position[1] + 1].wall = maze[position[0] + i][position[1] + 1].wall;
        }
        i += 1;
    }

    if (maze.length && (position[0] < (x - 1)) && (position[0] + i < x) && i <= sensor_range) {
        robotMaze[position[0] + i][position[1]].seen = true;
        robotMaze[position[0] + i][position[1]].wall = true;
    }
}


function getControl(currentPos, nextPos) {
    if (currentPos[0] < nextPos[0] && currentPos[1] == nextPos[1]) {
        return "Right";
    } else if (currentPos[0] > nextPos[0] && currentPos[1] == nextPos[1]) {
        return "Left";
    } else if (currentPos[0] == nextPos[0] && currentPos[1] < nextPos[1]) {
        return "Down";
    } else {
        return "Up";
    }
}

/*
  return true if position of a and b are the same. otherwise false.
*/

function samePosition(a, b) {
    return a[0] == b[0] && a[1] == b[1];
}

/*
  Return true if position is in path, visited. Otherwise return false
*/

function visited(path, position) {
    var i;
    for (i = path.length - 1; i >= 0; i -= 1) {
        if (samePosition(path[i], position)) {
            return true;
        }
    }
    return false;
}

function robotAction(evt) {
    if (evt == "Up") {
        mUp();
    } else if (evt == "Down") {
        mDown();
    } else if (evt == "Left") {
        mLeft();

    } else if (evt == "Right") {
        mRight();

    }

}

//Move Up

function mUp() {
    if (maze.length && robotCurrentY > 0 && !maze[robotCurrentX][robotCurrentY - 1].wall) {
        robotCurrentY -= 1;
    }
}

//Move Down

function mDown() {
    if (maze.length && robotCurrentY < y && !maze[robotCurrentX][robotCurrentY + 1].wall) {
        robotCurrentY += 1;
    }
}

//Move Left

function mLeft() {
    if (maze.length && robotCurrentX > 0 && !maze[robotCurrentX - 1][robotCurrentY].wall) {
        robotCurrentX -= 1;
    }

}

//Move Right

function mRight() {
    if (robotCurrentX < x && !maze[robotCurrentX + 1][robotCurrentY].wall) {
        robotCurrentX += 1;
    }
}



/********************************************************************************
Finally Events
********************************************************************************/
pauseButton.addEventListener('click', pauseTimers, false);
genMazeButton.addEventListener('click', createMaze, false);
showPathButton.addEventListener('click', showPath, false);

//Move robot or goal to other position
c.addEventListener("mouseup", function (e) {
    c.removeEventListener("mousemove", mouseMoving(e), false);
    var xBlock = Math.min(Math.floor(calculatedMouseX / cellW), x - 1);
    var yBlock = Math.min(Math.floor(calculatedMouseY / cellH), y - 1)

    //move robot
    if (robotHit) {
        robotHit = false;
        if (!maze[xBlock][yBlock].wall) {
            robotCurrentX = xBlock;
            robotCurrentY = yBlock;
        }
    }

    //move goal
    if (goalHit) {
        goalHit = false;
        if (!maze[xBlock][yBlock].wall) {
            endX = xBlock;
            endY = yBlock;
        }
    }
}, false);
c.addEventListener("mousemove", mouseMoving);
c.addEventListener("mousedown", canvasMouseOffsets, false);