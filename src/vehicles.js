// 40 vehicles spread across San Francisco neighborhoods
export const INITIAL_VEHICLES = [
  // Financial District / Embarcadero
  {id:'V-01',status:'normal',speed:28,conf:92,zone:'Financial District',lng:-122.3984,lat:37.7950,heading:45},
  {id:'V-02',status:'normal',speed:31,conf:88,zone:'Embarcadero',lng:-122.3944,lat:37.7956,heading:90},
  {id:'V-03',status:'alert',speed:18,conf:71,zone:'Financial District',lng:-122.4008,lat:37.7935,heading:180},
  // SoMa
  {id:'V-04',status:'normal',speed:24,conf:85,zone:'SoMa',lng:-122.4064,lat:37.7785,heading:270},
  {id:'V-05',status:'stopped',speed:0,conf:64,zone:'SoMa',lng:-122.4094,lat:37.7812,heading:0},
  {id:'V-06',status:'normal',speed:29,conf:91,zone:'SoMa',lng:-122.3994,lat:37.7801,heading:135},
  // Mission District
  {id:'V-07',status:'alert',speed:22,conf:74,zone:'Mission District',lng:-122.4194,lat:37.7599,heading:45},
  {id:'V-08',status:'normal',speed:27,conf:89,zone:'Mission District',lng:-122.4224,lat:37.7629,heading:90},
  {id:'V-09',status:'normal',speed:33,conf:94,zone:'Mission District',lng:-122.4154,lat:37.7559,heading:180},
  // Castro
  {id:'V-10',status:'normal',speed:26,conf:87,zone:'Castro',lng:-122.4350,lat:37.7609,heading:270},
  {id:'V-11',status:'rtb',speed:19,conf:96,zone:'Castro',lng:-122.4330,lat:37.7629,heading:315},
  // Noe Valley
  {id:'V-12',status:'normal',speed:25,conf:83,zone:'Noe Valley',lng:-122.4320,lat:37.7510,heading:45},
  {id:'V-13',status:'normal',speed:30,conf:90,zone:'Noe Valley',lng:-122.4290,lat:37.7490,heading:135},
  // Potrero Hill
  {id:'V-14',status:'normal',speed:28,conf:86,zone:'Potrero Hill',lng:-122.4044,lat:37.7599,heading:90},
  {id:'V-15',status:'alert',speed:14,conf:68,zone:'Potrero Hill',lng:-122.4014,lat:37.7569,heading:180},
  // Tenderloin / Civic Center
  {id:'V-16',status:'normal',speed:22,conf:82,zone:'Civic Center',lng:-122.4184,lat:37.7785,heading:270},
  {id:'V-17',status:'normal',speed:31,conf:93,zone:'Tenderloin',lng:-122.4144,lat:37.7835,heading:45},
  // Hayes Valley
  {id:'V-18',status:'normal',speed:27,conf:88,zone:'Hayes Valley',lng:-122.4254,lat:37.7765,heading:90},
  {id:'V-19',status:'normal',speed:29,conf:91,zone:'Hayes Valley',lng:-122.4284,lat:37.7795,heading:180},
  // Western Addition
  {id:'V-20',status:'normal',speed:26,conf:85,zone:'Western Addition',lng:-122.4364,lat:37.7835,heading:270},
  {id:'V-21',status:'rtb',speed:21,conf:97,zone:'Western Addition',lng:-122.4394,lat:37.7865,heading:315},
  // Richmond District
  {id:'V-22',status:'normal',speed:32,conf:90,zone:'Inner Richmond',lng:-122.4624,lat:37.7785,heading:45},
  {id:'V-23',status:'normal',speed:28,conf:87,zone:'Outer Richmond',lng:-122.4894,lat:37.7765,heading:90},
  {id:'V-24',status:'normal',speed:25,conf:84,zone:'Inner Richmond',lng:-122.4724,lat:37.7815,heading:180},
  // Sunset District
  {id:'V-25',status:'normal',speed:30,conf:89,zone:'Inner Sunset',lng:-122.4694,lat:37.7635,heading:270},
  {id:'V-26',status:'alert',speed:16,conf:72,zone:'Outer Sunset',lng:-122.5024,lat:37.7555,heading:45},
  {id:'V-27',status:'normal',speed:27,conf:86,zone:'Inner Sunset',lng:-122.4794,lat:37.7605,heading:135},
  // Haight-Ashbury
  {id:'V-28',status:'normal',speed:23,conf:83,zone:'Haight-Ashbury',lng:-122.4484,lat:37.7695,heading:90},
  {id:'V-29',status:'normal',speed:29,conf:91,zone:'Haight-Ashbury',lng:-122.4524,lat:37.7725,heading:180},
  // Marina / Cow Hollow
  {id:'V-30',status:'normal',speed:31,conf:92,zone:'Marina',lng:-122.4364,lat:37.8005,heading:270},
  {id:'V-31',status:'normal',speed:28,conf:88,zone:'Cow Hollow',lng:-122.4314,lat:37.7975,heading:45},
  // North Beach / Chinatown
  {id:'V-32',status:'normal',speed:24,conf:85,zone:'North Beach',lng:-122.4074,lat:37.8005,heading:90},
  {id:'V-33',status:'stopped',speed:0,conf:61,zone:'Chinatown',lng:-122.4074,lat:37.7955,heading:0},
  // Japantown
  {id:'V-34',status:'normal',speed:26,conf:87,zone:'Japantown',lng:-122.4314,lat:37.7855,heading:180},
  // Bernal Heights
  {id:'V-35',status:'normal',speed:25,conf:84,zone:'Bernal Heights',lng:-122.4154,lat:37.7449,heading:270},
  {id:'V-36',status:'rtb',speed:20,conf:95,zone:'Bernal Heights',lng:-122.4124,lat:37.7419,heading:315},
  // Excelsior
  {id:'V-37',status:'normal',speed:29,conf:90,zone:'Excelsior',lng:-122.4314,lat:37.7239,heading:45},
  {id:'V-38',status:'normal',speed:27,conf:86,zone:'Excelsior',lng:-122.4364,lat:37.7209,heading:135},
  // Glen Park
  {id:'V-39',status:'normal',speed:28,conf:88,zone:'Glen Park',lng:-122.4334,lat:37.7349,heading:90},
  // Visitacion Valley
  {id:'V-40',status:'alert',speed:12,conf:69,zone:'Visitacion Valley',lng:-122.4074,lat:37.7149,heading:180},
]

export const ALERTS = [
  {id:1,p:'P0',pt:'pt0',cls:'alert-p0',title:'V-04 stopped — SOMA',meta:'Conf 64% · Unknown obstruction · Tap for responder view',age:'4m',mod:'responder',vid:'V-04'},
  {id:2,p:'P0',pt:'pt0',cls:'alert-p0',title:'V-28 stopped — Dogpatch',meta:'Conf 58% · Sensor degradation',age:'2m',mod:'responder',vid:'V-28'},
  {id:3,p:'P1',pt:'pt1',cls:'alert-p1',title:'ETA +18 min — T-2847',meta:'V-03 · SOMA · AI hesitation events',age:'6m',mod:'trip',vid:'V-03'},
  {id:4,p:'P1',pt:'pt1',cls:'alert-p1',title:'ETA +14 min — T-2851',meta:'V-07 · Mission District · Zone blockage impact',age:'3m',mod:'trip',vid:'V-07'},
  {id:5,p:'P1',pt:'pt1',cls:'alert-p1',title:'ETA +11 min — T-2863',meta:'V-24 · Outer Richmond · Traffic congestion',age:'1m',mod:'trip',vid:'V-24'},
  {id:6,p:'P2',pt:'pt2',cls:'alert-p2',title:'Dropoff deviation +143m',meta:'T-2839 · V-14 · Noe Valley · Unclassified',age:'12m',mod:'trip',vid:'V-14'},
  {id:7,p:'P2',pt:'pt2',cls:'alert-p2',title:'Sensor degradation — V-33',meta:"V-33 · Fisherman's Wharf · Lidar 72% nominal",age:'8m',mod:'responder',vid:'V-33'},
]

export const STREETVIEW_LOCATIONS = {
  'Financial District':{lat:37.7938,lng:-122.3989,heading:45},
  'SOMA':{lat:37.7851,lng:-122.4027,heading:90},
  'Mission District':{lat:37.7599,lng:-122.4194,heading:180},
  'Castro':{lat:37.7609,lng:-122.4352,heading:270},
  'Noe Valley':{lat:37.7501,lng:-122.4321,heading:315},
  'Outer Sunset':{lat:37.7541,lng:-122.4892,heading:90},
  'Inner Sunset':{lat:37.7601,lng:-122.4651,heading:180},
  'Inner Richmond':{lat:37.7801,lng:-122.4589,heading:45},
  'Outer Richmond':{lat:37.7798,lng:-122.4891,heading:270},
  'Potrero Hill':{lat:37.7601,lng:-122.4021,heading:135},
  'Dogpatch':{lat:37.7551,lng:-122.3921,heading:90},
  'North Beach':{lat:37.8001,lng:-122.4089,heading:45},
  "Fisherman's Wharf":{lat:37.8081,lng:-122.4189,heading:180},
  'Haight-Ashbury':{lat:37.7701,lng:-122.4461,heading:270},
  'Western Addition':{lat:37.7791,lng:-122.4321,heading:90},
}
