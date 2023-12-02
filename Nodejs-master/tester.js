const cheerio = require('cheerio');
const axios = require('axios');

async function Eclass(_studentID, portal_id, portal_pw) {
    // JSON 배열에 항목 추가
    var jsonInfo = { studentID: _studentID, retCode: false, student_name: "", student_number: "", department: "", timeTable: [], timeTable_small: [] };

    try {
        // 포털 로그인
        const loginResponse = await axios.post('https://mportal.cau.ac.kr/common/auth/SSOlogin.do', {
            userID: portal_id,
            password: portal_pw
        });

        // 로그인 성공 여부 확인
        const cookies = loginResponse.headers['set-cookie'];
        if (!cookies || cookies[0].includes('prdct-NA')) {
            console.log('no cookie');
            return JSON.stringify(jsonInfo);
        }

        jsonInfo.retCode = true;

        // 학생 정보 페이지로 이동
        const infoResponse = await axios.get('https://mportal.cau.ac.kr/std/uhs/sUhsPer001/index.do', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });

        const $ = cheerio.load(infoResponse.data);

        // 학생 정보 스크래핑
        const studentName = $('span.ng-binding').eq(0).text();
        const studentNumber = $('span.ng-binding').eq(1).text();
        const department = $('span.ng-binding').eq(2).text();

        jsonInfo.student_name = studentName;
        jsonInfo.student_number = studentNumber;
        jsonInfo.department = department.replace(/\s+/g, ' ');

        if (!jsonInfo.student_name || jsonInfo.student_name.includes('{{vm.stuInfo.kor') || jsonInfo.student_name.includes('<!DOCTYPE html><ht')) {
            return JSON.stringify(jsonInfo);
        }

        // 시간표 페이지로 이동
        const timetableResponse = await axios.get('https://mportal.cau.ac.kr/std/usk/sUskCap003/index.do', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });

        const timetableHTML = timetableResponse.data;
        const timetable$ = cheerio.load(timetableHTML);

        // 시간표 스크래핑
        const Days_kor = ['월', '화', '수', '목', '금', '토', '일'];
        const times = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30'];

        for (let i = 0; i < 31; i++) {
            let str = timetableHTML.slice(timetableHTML.indexOf(times[i]), timetableHTML.indexOf(times[i + 1]));
            for (let j = 0; j < 7; j++) {
                let num = str.indexOf("&gt;&gt;");
                if (num != -1) {
                    var Date;
                    if (str.indexOf(Days_kor[0]) < num && num < str.indexOf(Days_kor[1])) Date = Days_kor[0];
                    else if (str.indexOf(Days_kor[1]) < num && num < str.indexOf(Days_kor[2])) Date = Days_kor[1];
                    else if (str.indexOf(Days_kor[2]) < num && num < str.indexOf(Days_kor[3])) Date = Days_kor[2];
                    else if (str.indexOf(Days_kor[3]) < num && num < str.indexOf(Days_kor[4])) Date = Days_kor[3];
                    else if (str.indexOf(Days_kor[4]) < num && num < str.indexOf(Days_kor[5])) Date = Days_kor[4];
                    else if (str.indexOf(Days_kor[5]) < num && num < str.indexOf(Days_kor[6])) Date = Days_kor[5];
                    else Date = Days_kor[6];

                    const strPiece = str.slice(num - 100, num);
                    const className = strPiece.slice(strPiece.indexOf('class="ng-binding ng-scope">') + 'class="ng-binding ng-scope">'.length, strPiece.indexOf('\n'));
                    const timetableElement = { day: Date, time: times[i], name: className };
                    jsonInfo.timeTable.push(timetableElement);
                    str = str.substring(num + 2);
                }
            }
        }

        jsonInfo.timeTable.sort((a, b) => Days_kor.indexOf(a.day) - Days_kor.indexOf(b.day));

        const groupedData = _.groupBy(jsonInfo.timeTable, 'name');
        jsonInfo.timeTable_small = Object.values(groupedData).map(group => group[0]);

        // JSON 문자열로 변환
        console.log(jsonInfo);
        return JSON.stringify(jsonInfo);
    } catch (error) {
        console.error('오류 발생:', error);
        return JSON.stringify(jsonInfo);
    }
}

console.log(4321)
Eclass('fdsa', 'joonkkkk1234', '@kjkszpj1234')
