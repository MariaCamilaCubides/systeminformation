'use strict';
// @ts-check
// ==================================================================================
// users.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2022
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 11. Users/Sessions
// ----------------------------------------------------------------------------------

const exec = require('child_process').exec;
const util = require('./util');

let _platform = process.platform;

const _linux = (_platform === 'linux' || _platform === 'android');
const _darwin = (_platform === 'darwin');
const _windows = (_platform === 'win32');
const _freebsd = (_platform === 'freebsd');
const _openbsd = (_platform === 'openbsd');
const _netbsd = (_platform === 'netbsd');
const _sunos = (_platform === 'sunos');

// let _winDateFormat = {
//   dateFormat: '',
//   dateSeperator: '',
//   timeFormat: '',
//   timeSeperator: '',
//   amDesignator: '',
//   pmDesignator: ''
// };

// --------------------------
// array of users online = sessions

// function getWinCulture() {
//   return new Promise((resolve) => {
//     process.nextTick(() => {
//       if (!_winDateFormat.dateFormat) {
//         util.powerShell('(get-culture).DateTimeFormat')
//           .then(data => {
//             let lines = data.toString().split('\r\n');
//             _winDateFormat.dateFormat = util.getValue(lines, 'ShortDatePattern', ':');
//             _winDateFormat.dateSeperator = util.getValue(lines, 'DateSeparator', ':');
//             _winDateFormat.timeFormat = util.getValue(lines, 'ShortTimePattern', ':');
//             _winDateFormat.timeSeperator = util.getValue(lines, 'TimeSeparator', ':');
//             _winDateFormat.amDesignator = util.getValue(lines, 'AMDesignator', ':');
//             _winDateFormat.pmDesignator = util.getValue(lines, 'PMDesignator', ':');

//             resolve(_winDateFormat);
//           })
//           .catch(() => {
//             resolve(_winDateFormat);
//           });
//       } else {
//         resolve(_winDateFormat);
//       }
//     });
//   });
// }

function parseUsersLinux(lines, phase) {
  let result = [];
  let result_who = [];
  let result_w = {};
  let w_first = true;
  let w_header = [];
  let w_pos = [];
  let who_line = {};

  let is_whopart = true;
  lines.forEach(function (line) {
    if (line === '---') {
      is_whopart = false;
    } else {
      let l = line.replace(/ +/g, ' ').split(' ');

      // who part
      if (is_whopart) {
        result_who.push({
          user: l[0],
          tty: l[1],
          date: l[2],
          time: l[3],
          ip: (l && l.length > 4) ? l[4].replace(/\(/g, '').replace(/\)/g, '') : ''
        });
      } else {
        // w part
        if (w_first) {    // header
          w_header = l;
          w_header.forEach(function (item) {
            w_pos.push(line.indexOf(item));
          });
          w_first = false;
        } else {
          // split by w_pos
          result_w.user = line.substring(w_pos[0], w_pos[1] - 1).trim();
          result_w.tty = line.substring(w_pos[1], w_pos[2] - 1).trim();
          result_w.ip = line.substring(w_pos[2], w_pos[3] - 1).replace(/\(/g, '').replace(/\)/g, '').trim();
          result_w.command = line.substring(w_pos[7], 1000).trim();
          // find corresponding 'who' line
          who_line = result_who.filter(function (obj) {
            return (obj.user.substring(0, 8).trim() === result_w.user && obj.tty === result_w.tty);
          });
          if (who_line.length === 1) {
            result.push({
              user: who_line[0].user,
              tty: who_line[0].tty,
              date: who_line[0].date,
              time: who_line[0].time,
              ip: who_line[0].ip,
              command: result_w.command
            });
          }
        }
      }
    }
  });
  if (result.length === 0 && phase === 2) {
    return result_who;
  } else {
    return result;
  }
}

function parseUsersDarwin(lines) {
  let result = [];
  let result_who = [];
  let result_w = {};
  let who_line = {};

  let is_whopart = true;
  lines.forEach(function (line) {
    if (line === '---') {
      is_whopart = false;
    } else {
      let l = line.replace(/ +/g, ' ').split(' ');

      // who part
      if (is_whopart) {
        result_who.push({
          user: l[0],
          tty: l[1],
          date: ('' + new Date().getFullYear()) + '-' + ('0' + ('JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC'.indexOf(l[2].toUpperCase()) / 3 + 1)).slice(-2) + '-' + ('0' + l[3]).slice(-2),
          time: l[4],
        });
      } else {
        // w part
        // split by w_pos
        result_w.user = l[0];
        result_w.tty = l[1];
        result_w.ip = (l[2] !== '-') ? l[2] : '';
        result_w.command = l.slice(5, 1000).join(' ');
        // find corresponding 'who' line
        who_line = result_who.filter(function (obj) {
          return (obj.user === result_w.user && (obj.tty.substring(3, 1000) === result_w.tty || obj.tty === result_w.tty));
        });
        if (who_line.length === 1) {
          result.push({
            user: who_line[0].user,
            tty: who_line[0].tty,
            date: who_line[0].date,
            time: who_line[0].time,
            ip: result_w.ip,
            command: result_w.command
          });
        }
      }
    }
  });
  return result;
}

// function parseUsersWin(lines, culture) {

//   let result = [];
//   const header = lines[0];
//   const headerDelimiter = [];
//   if (header) {
//     const start = (header[0] === ' ') ? 1 : 0;
//     headerDelimiter.push(start - 1);
//     let nextSpace = 0;
//     for (let i = start + 1; i < header.length; i++) {
//       if (header[i] === ' ' && ((header[i - 1] === ' ') || (header[i - 1] === '.'))) {
//         nextSpace = i;
//       } else {
//         if (nextSpace) {
//           headerDelimiter.push(nextSpace);
//           nextSpace = 0;
//         }
//       }
//     }
//     for (let i = 1; i < lines.length; i++) {
//       if (lines[i].trim()) {
//         const user = lines[i].substring(headerDelimiter[0] + 1, headerDelimiter[1]).trim() || '';
//         const tty = lines[i].substring(headerDelimiter[1] + 1, headerDelimiter[2] - 2).trim() || '';
//         const dateTime = util.parseDateTime(lines[i].substring(headerDelimiter[5] + 1, 2000).trim(), culture) || '';
//         result.push({
//           user: user,
//           tty: tty,
//           date: dateTime.date,
//           time: dateTime.time,
//           ip: '',
//           command: ''
//         });
//       }
//     }
//   }
//   return result;
// }

function users(callback) {

  return new Promise((resolve) => {
    process.nextTick(() => {
      let result = [];

      // linux
      if (_linux) {
        exec('who --ips; echo "---"; w | tail -n +2', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersLinux(lines, 1);
            if (result.length === 0) {
              exec('who; echo "---"; w | tail -n +2', function (error, stdout) {
                if (!error) {
                  // lines / split
                  lines = stdout.toString().split('\n');
                  result = parseUsersLinux(lines, 2);
                }
                if (callback) { callback(result); }
                resolve(result);
              });
            } else {
              if (callback) { callback(result); }
              resolve(result);
            }
          } else {
            if (callback) { callback(result); }
            resolve(result);
          }
        });
      }
      if (_freebsd || _openbsd || _netbsd) {
        exec('who; echo "---"; w -ih', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_sunos) {
        exec('who; echo "---"; w -h', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }

      if (_darwin) {
        exec('who; echo "---"; w -ih', function (error, stdout) {
          if (!error) {
            // lines / split
            let lines = stdout.toString().split('\n');
            result = parseUsersDarwin(lines);
          }
          if (callback) { callback(result); }
          resolve(result);
        });
      }
      if (_windows) {
        try {
          // const workload = [];
          // // workload.push(util.powerShell('Get-CimInstance -ClassName Win32_Account | fl *'));
          // workload.push(util.powerShell('Get-WmiObject Win32_LogonSession | fl *'));
          // workload.push(util.powerShell('Get-WmiObject Win32_LoggedOnUser | fl *'));
          // workload.push(util.powerShell('Get-WmiObject Win32_Process -Filter "name=\'explorer.exe\'" | Select @{Name="domain";Expression={$_.GetOwner().Domain}}, @{Name="username";Expression={$_.GetOwner().User}} | fl'));
          // Promise.all(
          //   workload
          // ).then(data => {
          let cmd = 'Get-WmiObject Win32_LogonSession | fl *' + '; echo \'#-#-#-#\';';
          cmd += 'Get-WmiObject Win32_LoggedOnUser | fl *' + '; echo \'#-#-#-#\';';
          cmd += 'Get-WmiObject Win32_Process -Filter "name=\'explorer.exe\'" | Select @{Name="domain";Expression={$_.GetOwner().Domain}}, @{Name="username";Expression={$_.GetOwner().User}} | fl';
          util.powerShell(cmd).then(data => {
            // controller + vram
            // let accounts = parseWinAccounts(data[0].split(/\n\s*\n/));
            if (data) {
              data = data.split('#-#-#-#');
              let sessions = parseWinSessions(data[0].split(/\n\s*\n/));
              let loggedons = parseWinLoggedOn(data[1].split(/\n\s*\n/));
              let users = parseWinUsers(data[2].split(/\n\s*\n/));
              for (let id in loggedons) {
                if ({}.hasOwnProperty.call(loggedons, id)) {
                  loggedons[id].dateTime = {}.hasOwnProperty.call(sessions, id) ? sessions[id] : '';
                }
              }
              users.forEach(user => {
                let dateTime = '';
                for (let id in loggedons) {
                  if ({}.hasOwnProperty.call(loggedons, id)) {
                    if (loggedons[id].user === user.user && (!dateTime || dateTime < loggedons[id].dateTime)) {
                      dateTime = loggedons[id].dateTime;
                    }
                  }
                }

                result.push({
                  user: user.user,
                  tty: '',
                  date: `${dateTime.substr(0, 4)}-${dateTime.substr(4, 2)}-${dateTime.substr(6, 2)}`,
                  time: `${dateTime.substr(8, 2)}:${dateTime.substr(10, 2)}`,
                  ip: '',
                  command: ''
                });
              });
            }
            if (callback) { callback(result); }
            resolve(result);

          });
          // util.powerShell('query user').then(stdout => {
          //   if (stdout) {
          //     // lines / split
          //     let lines = stdout.toString().split('\r\n');
          //     getWinCulture()
          //       .then(culture => {
          //         result = parseUsersWin(lines, culture);
          //         if (callback) { callback(result); }
          //         resolve(result);
          //       });
          //   } else {
          //     if (callback) { callback(result); }
          //     resolve(result);
          //   }
          // });
        } catch (e) {
          if (callback) { callback(result); }
          resolve(result);
        }
      }

    });
  });
}

// function parseWinAccounts(accountParts) {
//   const accounts = [];
//   accountParts.forEach(account => {
//     const lines = account.split('\r\n');
//     const name = util.getValue(lines, 'name', ':', true);
//     const domain = util.getValue(lines, 'domain', ':', true);
//     accounts.push(`${domain}\${name}`);
//   });
//   return accounts;
// }

function parseWinSessions(sessionParts) {
  const sessions = {};
  sessionParts.forEach(session => {
    const lines = session.split('\r\n');
    const id = util.getValue(lines, 'LogonId');
    const starttime = util.getValue(lines, 'starttime');
    if (id) {
      sessions[id] = starttime;
    }
  });
  return sessions;
}

function parseWinUsers(userParts) {
  const users = [];
  userParts.forEach(user => {
    const lines = user.split('\r\n');

    const domain = util.getValue(lines, 'domain', ':', true);
    const username = util.getValue(lines, 'username', ':', true);
    if (username) {
      users.push({
        domain,
        user: username
      });
    }
  });
  return users;
}

function parseWinLoggedOn(loggedonParts) {
  const loggedons = {};
  loggedonParts.forEach(loggedon => {
    const lines = loggedon.split('\r\n');

    const antecendent = util.getValue(lines, 'antecedent', ':', true);
    let parts = antecendent.split(',');
    const domainParts = parts.length > 1 ? parts[0].split('=') : [];
    const nameParts = parts.length > 1 ? parts[1].split('=') : [];
    const domain = domainParts.length > 1 ? domainParts[1].replace(/"/g, '') : '';
    const name = nameParts.length > 1 ? nameParts[1].replace(/"/g, '') : '';
    const dependent = util.getValue(lines, 'dependent', ':', true);
    parts = dependent.split('=');
    const id = parts.length > 1 ? parts[1].replace(/"/g, '') : '';
    if (id) {
      loggedons[id] = {
        domain,
        user: name
      };
    }
  });
  return loggedons;
}

exports.users = users;
