import type { Trip } from '~/types/Trips';

export const getDayOfWeek = (ts: number) => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[new Date(ts).getDay()];
};

export const generateTripMarkdown = (t: Trip): string => {
  let md = `## 🇹🇼 ${t.name}\n\n`;

  let dateRangeStr = '';
  if (t.startDate || t.endDate) {
    const startStr = t.startDate ? `${new Date(t.startDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })} (${getDayOfWeek(t.startDate)})` : '未定出發';
    const endStr = t.endDate ? `${new Date(t.endDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })} (${getDayOfWeek(t.endDate)})` : '未定結束';
    dateRangeStr = `**📅 行程期間**：${startStr} — ${endStr}\n\n`;
  }
  md += dateRangeStr;

  if (t.summary) {
    md += `${t.summary}\n\n`;
  }

  md += `## ✈️ 航班資訊\n\n`;
  if (t.flights && t.flights.length > 0) {
    md += `|航段|航班編號|啟程 / 抵達時間|路線|\n`;
    md += `|---|---|---|---|\n`;
    t.flights.forEach((f) => {
      const seg = f.segmentType || '其他';
      const flightNo = `${f.airline || ''} ${f.flightNumber || ''}`.trim();
      const time = `${f.departureTime || '未知'} - ${f.arrivalTime || '未知'}`;

      const depName = f.departureAirportName ? f.departureAirportName : f.departureAirport || '未知機場';
      const arrName = f.arrivalAirportName ? f.arrivalAirportName : f.arrivalAirport || '未知機場';
      const route = `${depName} → ${arrName}`;

      md += `|${seg}|${flightNo}|${time}|${route}|\n`;
    });
    md += `\n`;
  } else {
    md += `*尚無航班資訊*\n\n`;
  }

  if (t.itinerary && t.itinerary.length > 0) {
    const zhNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];
    t.itinerary.forEach((day, index) => {
      let dateStr = '未定日期';
      if (day.date) {
        const d = new Date(day.date);
        const m = d.getMonth() + 1;
        const date = d.getDate();
        dateStr = `${m} 月 ${date} 日 (週${getDayOfWeek(d.getTime())})`;
      }
      const dayNumStr = zhNums[index] || (index + 1).toString();

      md += `## 🗓 ${dateStr} - 第${dayNumStr}天\n\n`;

      if (day.items && day.items.length > 0) {
        day.items.forEach(item => {
          md += `- **${item.activity || '未定活動'}**`;
          if (item.location) md += ` (${item.location})`;
          md += `\n`;

          if (item.timeString) md += `    - 時間：${item.timeString}\n`;
          if (item.notes) md += `    - 備註：${item.notes}\n`;
          md += `\n`;
        });
      } else {
        md += `*尚無活動*\n\n`;
      }
    });
  } else {
    md += `*尚未建立行程內容*\n\n`;
  }

  return md;
};
