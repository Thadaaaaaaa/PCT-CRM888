// Postcode groups and colours from the "postcode-zones" summary workbook.
// Keep this file data-only so CRM display logic can change independently.
(function () {
  'use strict';
  const groups = [
    ['G01', '#1E40AF', '#FFFFFF', ['10100','10110','10120','10310']],
    ['G02', '#B91C1C', '#FFFFFF', ['10130','10140','10150','10600']],
    ['G03', '#15803D', '#FFFFFF', ['10160','10170']],
    ['G04', '#B45309', '#FFFFFF', ['10200','10300','10320','10321','10330','10400','10500']],
    ['G05', '#7E22CE', '#FFFFFF', ['10210','10220','10222','10900']],
    ['G06', '#0E7490', '#FFFFFF', ['10230','10240']],
    ['G07', '#BE185D', '#FFFFFF', ['10250','10254','10260']],
    ['G08', '#4D7C0F', '#FFFFFF', ['10270','10271','10290']],
    ['G09', '#C2410C', '#FFFFFF', ['10280']],
    ['G10', '#475569', '#FFFFFF', ['10510']],
    ['G11', '#9333EA', '#FFFFFF', ['10520','10521']],
    ['G12', '#0369A1', '#FFFFFF', ['10530']],
    ['G13', '#4338CA', '#FFFFFF', ['10540']],
    ['G14', '#E11D48', '#FFFFFF', ['10550','10560','10570']],
    ['G15', '#047857', '#FFFFFF', ['10700','10800','11130']],
    ['G16', '#A16207', '#FFFFFF', ['11000','11120']],
    ['G17', '#6D28D9', '#FFFFFF', ['11110','11140']],
    ['G18', '#0F766E', '#FFFFFF', ['11150']],
    ['G19', '#9F1239', '#FFFFFF', ['12000']],
    ['G20', '#1D4ED8', '#FFFFFF', ['12110','12150']],
    ['G21', '#166534', '#FFFFFF', ['12120']],
    ['G22', '#C026D3', '#FFFFFF', ['12130']],
    ['G23', '#92400E', '#FFFFFF', ['12170']],
    ['G24', '#155E75', '#FFFFFF', ['74000']],
    ['G25', '#7C2D12', '#FFFFFF', ['75000']],
    ['G26', '#4F46E5', '#FFFFFF', ['80000']],
    ['G27', '#A21CAF', '#FFFFFF', ['92110']],
    ['CHECK', '#F59E0B', '#111827', ['1026','105410','90326']]
  ].map(function (entry) { return { id: entry[0], color: entry[1], textColor: entry[2], postcodes: entry[3] }; });
  const lookup = {};
  groups.forEach(function (group) {
    group.postcodes.forEach(function (postcode) { lookup[postcode] = group; });
  });
  window.PCT_POSTCODE_ZONES = Object.freeze(groups);
  window.pctFindPostcodeZone = function (postcode) {
    return lookup[String(postcode == null ? '' : postcode).replace(/\D/g, '')] || null;
  };
})();
