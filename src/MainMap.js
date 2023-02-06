import React, { Component } from "react";
import lifts from './data/lifts.json'
import trails from './data/trails.json'
import lodges from './data/lodges.json'

export default class MainMap extends Component {
    constructor(props){
        super(props);
        this.state = {
         start: "",
         end: "",
         startSearchTerm: "",
         endSearchTerm: "",
        };
        this.id2Name = new Map();
        lodges.forEach(l => this.id2Name.set(l.id, l.name));
        lifts.forEach(l => this.id2Name.set(l.id, l.name));
        trails.forEach(t => {
          this.id2Name.set(t.id, t.name);
          if (t.forks.length > 0) {
            t.forks.forEach(f => this.id2Name.set(f.id, t.name+"+"+f.distance+"mi"));
          }
        });
    }


    findPath() {
      var lines = {};
      // add lodge -> lifts edge, assume one direction
      // i.e. no taking lifts to a lodge
      lodges.forEach(l => l.lifts.forEach(li => {
        if (l.id in lines) {
          lines[l.id].add(li);
        } else {
          lines[l.id] = new Set();
          lines[l.id].add(li);
        }
      }));
      // add lift -> trail, trail -> lift/lodge/fork, fork -> trail
      for (var idx in trails) {
        const trail = trails[idx];
        if (trail.start in lines) {
          lines[trail.start].add(trail.id);
        } else {
          lines[trail.start] = new Set();
          lines[trail.start].add(trail.id);
        }
        if (trail.id in lines) {
          trail.end.forEach(e => lines[trail.id].add(e));
        } else {
          lines[trail.id] = new Set();
          trail.end.forEach(e => lines[trail.id].add(e));
        }
        if (trail.forks.length > 0) {
          for (var idx in trail.forks) {
            const fork = trail.forks[idx];
            lines[trail.start].add(fork.id);
            for (var idx in fork.trails) {
              const sub_trail = fork.trails[idx];
              if (fork.id in lines) {
                lines[fork.id].add(sub_trail);
                lines[fork.id].add(trail.id);
              } else {
                lines[fork.id] = new Set();
                lines[fork.id].add(sub_trail);
                lines[fork.id].add(trail.id);
              }
            }
          }
        }
      }
      var results = [];
      function dfs(visited, start, end, curPath) {
        if (!(start in lines)) {
          return;
        }
        for (var e of lines[start].values()) {
          if (visited.has(e)) {
            continue;
          }
          if (e == end) {
            var new_path = curPath.slice();
            new_path.push(e);
            results.push(new_path);
            continue;
          }
          var new_visited = new Set(visited);
          new_visited.add(e);
          var new_path = curPath.slice();
          new_path.push(e);
          dfs(new_visited, e, end, new_path);
        }
      }

      function pergeImpossibleRoutes() {
        results = results.filter(route => {
          var forks = route.filter(stop => stop.startsWith("fo"));
          var forkIdxMap = new Map();
          for (var i in forks) {
            const [_, trail, idx] = forks[i].split("_");
            if (forkIdxMap.has(trail)) {
              if (forkIdxMap.get(trail) > idx) {
                return false;
              }
            }
            else {
              forkIdxMap.set(trail, idx);
            }
          }
          return true;
        });
      }

      var visited = new Set([this.state.start]);
      dfs(visited, this.state.start, this.state.end, [this.state.start]);
      pergeImpossibleRoutes();
      return results;
    }

    render() {
      const startOptions = 
        lifts.map(lift => <option value={lift.id}>{lift.name}</option>)
          .concat(lodges.map(lodge => <option value={lodge.id}>{lodge.name}</option>));
      const endOptions = 
        lifts.map(lift => lift.id == this.state.start ? null : <option value={lift.id}>{lift.name}</option>)
          .concat(lodges.map(lodge => lodge.id == this.state.start ? null : <option value={lodge.id}>{lodge.name}</option>));
      const {start, end} = this.state;
      var renderPath = null;
      if (start && end) {
        var paths = this.findPath(start, end);
        renderPath = paths.map(path => <div>{path.map(p => this.id2Name.get(p)).join("->")}</div>);
      }
      return (
        <>
        <div>
        <img width="400" height="300" src="logo.png" />
        </div>
        <div>
           <select onChange={e => this.setState({start: e.target.value})} required>\
             <option value="" disabled selected>Select a start</option>
             {startOptions}
           </select>
         </div>
         {this.state.start ?
            (         
           <div>
             <select onChange={e => this.setState({end: e.target.value})}>
               <option value="" disabled selected>Select a destination</option>
               {endOptions}
             </select>
           </div>
           ) : ""
         }
         {renderPath}
         </>
     );
    }
}