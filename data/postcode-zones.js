// Source: Appointment Zone.xlsx; six worksheet header fills, Excel theme+tint resolved to RGB.
// Reviewed 2026-11-04. Unknown postcodes are outside the supplied service zones.
(function () {
 'use strict';
 const groups = [
  {
    "id": "Red zone",
    "label": "โซนสีแดง",
    "color": "#FF0000",
    "textColor": "#111827",
    "postcodes": [
      "10100",
      "10110",
      "10120",
      "10200",
      "10300",
      "10330",
      "10500",
      "10170",
      "10600",
      "10700"
    ],
    "places": [
      [
        "10100",
        "วัดไตรมิตรวิทยาราม"
      ],
      [
        "10110",
        "Terminal 21 Asok"
      ],
      [
        "10120",
        "Central Rama 3"
      ],
      [
        "10200",
        "อนุสาวรีย์ประชาธิปไตย"
      ],
      [
        "10300",
        "พระที่นั่งอนันตสมาคม"
      ],
      [
        "10330",
        "MBK Center"
      ],
      [
        "10500",
        "King Power Mahanakhon"
      ],
      [
        "10170",
        "ตลาดน้ำตลิ่งชัน"
      ],
      [
        "10600",
        "วงเวียนใหญ่"
      ],
      [
        "10700",
        "โรงพยาบาลศิริราช"
      ]
    ]
  },
  {
    "id": "Orange zone",
    "label": "โซนสีส้ม",
    "color": "#E97132",
    "textColor": "#111827",
    "postcodes": [
      "10210",
      "10220",
      "10310",
      "10320",
      "10321",
      "10400",
      "10800",
      "10900"
    ],
    "places": [
      [
        "10210",
        "Lak Si · IT Square Laksi / Don Mueang · Don Mueang International Airport"
      ],
      [
        "10220",
        "Bang Khen · Central Ramindra"
      ],
      [
        "10310",
        "Huai Khwang · MRT Huai Khwang"
      ],
      [
        "10320",
        "Huai Khwang · Thailand Cultural Centre"
      ],
      [
        "10321",
        "Din Daeng / Huai Khwang · Sutthisan Post Office"
      ],
      [
        "10400",
        "Ratchathewi · Victory Monument"
      ],
      [
        "10800",
        "Bang Sue · Krung Thep Aphiwat Central Terminal"
      ],
      [
        "10900",
        "Chatuchak · Central Ladprao"
      ]
    ]
  },
  {
    "id": "Blue zone",
    "label": "โซนสีฟ้า",
    "color": "#4E95D9",
    "textColor": "#111827",
    "postcodes": [
      "10130",
      "10140",
      "10150",
      "10160",
      "10290"
    ],
    "places": [
      [
        "10130",
        "Phra Pradaeng District Office"
      ],
      [
        "10140",
        "Rat Burana District Office"
      ],
      [
        "10150",
        "Chom Thong District Office"
      ],
      [
        "10160",
        "The Mall Lifestore Bangkae"
      ],
      [
        "10290",
        "Phra Samut Chedi"
      ]
    ]
  },
  {
    "id": "Green zone",
    "label": "โซนสีเขียว",
    "color": "#47D45A",
    "textColor": "#111827",
    "postcodes": [
      "10230",
      "10240",
      "10250",
      "10254",
      "10260"
    ],
    "places": [
      [
        "10230",
        "Lat Phrao · Central EastVille"
      ],
      [
        "10240",
        "Bang Kapi · The Mall Lifestore Bangkapi"
      ],
      [
        "10250",
        "Suan Luang · Thanya Park Srinakarin"
      ],
      [
        "10254",
        "Prawet · Seacon Square Srinakarin"
      ],
      [
        "10260",
        "Bang Na · BITEC Bangna"
      ]
    ]
  },
  {
    "id": "Purple zone",
    "label": "โซนสีม่วง",
    "color": "#A02B93",
    "textColor": "#FFFFFF",
    "postcodes": [
      "10510",
      "10520",
      "10521",
      "10530",
      "10550",
      "10570"
    ],
    "places": [
      [
        "10510",
        "Min Buri · Min Buri Market"
      ],
      [
        "10520",
        "Lat Krabang · King Mongkut's Institute of Technology Ladkrabang"
      ],
      [
        "10521",
        "Lat Krabang · Chao Khun Thahan Post Office"
      ],
      [
        "10530",
        "Nong Chok · Nong Chok District Office"
      ],
      [
        "10550",
        "Khlong Dan · Khlong Dan Post Office"
      ],
      [
        "10570",
        "Bang Sao Thong · Assumption University Suvarnabhumi Campus"
      ]
    ]
  },
  {
    "id": "Pink zone",
    "label": "โซนสีชมพู",
    "color": "#FFCCFF",
    "textColor": "#111827",
    "postcodes": [
      "10270",
      "10271",
      "10280",
      "10540",
      "10560"
    ],
    "places": [
      [
        "10270",
        "Mueang Samut Prakan · Samut Prakan City Hall"
      ],
      [
        "10271",
        "Samrong · Imperial World Samrong"
      ],
      [
        "10280",
        "Bang Pu · Ancient City Samut Prakan"
      ],
      [
        "10540",
        "Bang Phli · Mega Bangna"
      ],
      [
        "10560",
        "Bang Bo · Bang Bo District Office"
      ]
    ]
  }
];
 const lookup = Object.create(null);
 groups.forEach(function(group){group.postcodes.forEach(function(code){if(lookup[code])throw new Error('Duplicate service postcode: '+code);lookup[code]=group;});});
 window.PCT_POSTCODE_ZONES = Object.freeze(groups);
 window.PCT_POSTCODE_ZONE_REFERENCE = groups.map(function(group){return {label:group.label+' · '+group.id,color:group.color,textColor:group.textColor,places:group.places};});
 window.pctFindPostcodeZone = function(postcode){return lookup[String(postcode==null?'':postcode).trim()]||null;};
})();

