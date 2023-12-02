const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const lodash = require('lodash');

async function Eclass(_studentID, portal_id, portal_pw) {
    // JSON 배열에 항목 추가
    var jsonInfo = { studentID: _studentID, retCode: false, student_name: "", student_number: "", department: "", timeTable: [], timeTable_small: [] };

    // Selenium WebDriver를 시작합니다.
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();

    try {

        // 로그인 페이지로 이동
        await driver.get('https://mportal.cau.ac.kr/common/auth/SSOlogin.do');
        await driver.wait(until.elementLocated(By.name('userID')), 10000);

        // 아이디와 비밀번호 입력
        await driver.findElement(By.name('userID')).sendKeys(portal_id);
        await driver.findElement(By.name('password')).sendKeys(portal_pw);

        // 로그인 버튼 클릭
        await driver.findElement(By.css('a.btn-login')).click();

        // 쿠키 획득
        const cookies = await driver.manage().getCookies();

        if (!cookies || cookies.length === 0) {
            console.error('No cookies found after login');
            return JSON.stringify(jsonInfo);
        }

        jsonInfo.retCode = true;

        // 로그인 후 페이지로 이동
        await driver.get('https://mportal.cau.ac.kr/std/uhs/sUhsPer001/index.do');
        await driver.wait(until.urlIs('https://mportal.cau.ac.kr/std/uhs/sUhsPer001/index.do'), 10000);

        // 학생 정보 추출
        const pageContent1 = await driver.getPageSource();

        const wow5 = '성명';
        pageContent_name = pageContent1.substring(pageContent1.indexOf(wow5), pageContent1.indexOf(wow5) + 200);
        const wow6 = '<span class="ng-binding">';
        pageContent_name = pageContent_name.substring(pageContent_name.indexOf(wow6) + wow6.length, pageContent_name.indexOf('</span>'));

        //console.log(pageContent_department, pageContent_department.length);
        jsonInfo.student_name = pageContent_name;

        const wow = '학번';
        pageContent_number = pageContent1.substring(pageContent1.indexOf(wow), pageContent1.indexOf(wow) + 200);
        const wow2 = '<span class="ng-binding">';
        pageContent_number = pageContent_number.substring(pageContent_number.indexOf(wow2) + wow2.length, pageContent_number.indexOf('</span>'));

        //console.log(pageContent_number, pageContent_number.length);
        jsonInfo.student_number = pageContent_number;

        const wow3 = '소속 (학과)';
        pageContent_department = pageContent1.substring(pageContent1.indexOf(wow3), pageContent1.indexOf(wow3) + 200);
        const wow4 = '<span class="ng-binding">';
        pageContent_department = pageContent_department.substring(pageContent_department.indexOf(wow4) + wow4.length, pageContent_department.indexOf('</span>'));

        //console.log(pageContent_department, pageContent_department.length);
        pageContent_department = pageContent_department.replace('&nbsp;&nbsp;', " ");
        jsonInfo.department = pageContent_department;

        if (jsonInfo.student_name.length === 0
            || jsonInfo.student_name === '      <dd>\n            <span>{{vm.stuInfo.kornm}}'
            || jsonInfo.student_name === "<!DOCTYPE html><html><he'") {
            return JSON.stringify(jsonInfo);
        }

        // 시간표 페이지로 이동
        await driver.get('https://mportal.cau.ac.kr/std/usk/sUskCap003/index.do');
        await driver.wait(until.urlIs('https://mportal.cau.ac.kr/std/usk/sUskCap003/index.do'), 10000);
        const pageContent2 = await driver.getPageSource();

        var timeTableArray = []
        //const Days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const Days_kor = ['월', '화', '수', '목', '금', '토', '일'];
        const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30']
        for (let i = 0; i < 31; i++) {
            let str = pageContent2.slice(pageContent2.indexOf(times[i]), pageContent2.indexOf(times[i + 1]));
            for (let j = 0; j < 7; j++) {
                let num = str.indexOf("&gt;&gt;")
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
                    timeTableArray.push(timetableElement);
                    str = str.substring(num + 2);
                }
            }
        }
        timeTableArray.sort((a, b) => Days_kor.indexOf(a.day) - Days_kor.indexOf(b.day));

        const groupedData = lodash.groupBy(timeTableArray, 'name');
        const result = Object.values(groupedData).map(group => group[0]);

        jsonInfo.timeTable = timeTableArray;
        jsonInfo.timeTable_small = result;

        console.log(jsonInfo);
        return JSON.stringify(jsonInfo);
    } catch (error) {
        console.error('An error occurred:', error);
        jsonInfo.retCode = false;
        return JSON.stringify(jsonInfo);
    }  finally {
        await driver.quit();
    }
}

module.exports = { Eclass };
