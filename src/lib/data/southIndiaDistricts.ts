// South India district → city/town master list.
// States covered: Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana.
// `cities` lists the district headquarters plus notable towns; extend as needed.

export interface DistrictEntry {
  district: string
  state:    string
  cities:   string[]
}

export const SOUTH_INDIA_DISTRICTS: DistrictEntry[] = [
  // ─── Tamil Nadu ─────────────────────────────────────────────────────────────
  { district: 'Ariyalur',        state: 'Tamil Nadu', cities: ['Ariyalur', 'Jayankondam', 'Sendurai', 'Udayarpalayam'] },
  { district: 'Chengalpattu',    state: 'Tamil Nadu', cities: ['Chengalpattu', 'Tambaram', 'Maraimalai Nagar', 'Guduvancheri', 'Mahabalipuram', 'Tirukalukundram'] },
  { district: 'Chennai',         state: 'Tamil Nadu', cities: ['Chennai', 'T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Mylapore', 'Egmore', 'Guindy'] },
  { district: 'Coimbatore',      state: 'Tamil Nadu', cities: ['Coimbatore', 'Pollachi', 'Mettupalayam', 'Sulur', 'Valparai', 'Kinathukadavu'] },
  { district: 'Cuddalore',       state: 'Tamil Nadu', cities: ['Cuddalore', 'Chidambaram', 'Neyveli', 'Panruti', 'Virudhachalam'] },
  { district: 'Dharmapuri',      state: 'Tamil Nadu', cities: ['Dharmapuri', 'Palacode', 'Harur', 'Pennagaram'] },
  { district: 'Dindigul',        state: 'Tamil Nadu', cities: ['Dindigul', 'Palani', 'Kodaikanal', 'Oddanchatram', 'Batlagundu'] },
  { district: 'Erode',           state: 'Tamil Nadu', cities: ['Erode', 'Gobichettipalayam', 'Bhavani', 'Sathyamangalam', 'Perundurai'] },
  { district: 'Kallakurichi',    state: 'Tamil Nadu', cities: ['Kallakurichi', 'Chinnasalem', 'Sankarapuram', 'Ulundurpet'] },
  { district: 'Kancheepuram',    state: 'Tamil Nadu', cities: ['Kancheepuram', 'Sriperumbudur', 'Walajabad', 'Uthiramerur'] },
  { district: 'Kanyakumari',     state: 'Tamil Nadu', cities: ['Nagercoil', 'Kanyakumari', 'Colachel', 'Marthandam', 'Thuckalay'] },
  { district: 'Karur',           state: 'Tamil Nadu', cities: ['Karur', 'Kulithalai', 'Aravakurichi', 'Krishnarayapuram'] },
  { district: 'Krishnagiri',     state: 'Tamil Nadu', cities: ['Krishnagiri', 'Hosur', 'Denkanikottai', 'Pochampalli'] },
  { district: 'Madurai',         state: 'Tamil Nadu', cities: ['Madurai', 'Melur', 'Usilampatti', 'Thirumangalam', 'Vadipatti'] },
  { district: 'Mayiladuthurai',  state: 'Tamil Nadu', cities: ['Mayiladuthurai', 'Sirkazhi', 'Tharangambadi', 'Kuthalam'] },
  { district: 'Nagapattinam',    state: 'Tamil Nadu', cities: ['Nagapattinam', 'Velankanni', 'Vedaranyam', 'Kilvelur'] },
  { district: 'Namakkal',        state: 'Tamil Nadu', cities: ['Namakkal', 'Rasipuram', 'Tiruchengode', 'Komarapalayam', 'Paramathi Velur'] },
  { district: 'Nilgiris',        state: 'Tamil Nadu', cities: ['Udhagamandalam (Ooty)', 'Coonoor', 'Gudalur', 'Kotagiri', 'Wellington'] },
  { district: 'Perambalur',      state: 'Tamil Nadu', cities: ['Perambalur', 'Kunnam', 'Veppanthattai', 'Alathur'] },
  { district: 'Pudukkottai',     state: 'Tamil Nadu', cities: ['Pudukkottai', 'Aranthangi', 'Alangudi', 'Illuppur', 'Karambakudi'] },
  { district: 'Ramanathapuram',  state: 'Tamil Nadu', cities: ['Ramanathapuram', 'Rameswaram', 'Paramakudi', 'Mudukulathur', 'Kilakarai'] },
  { district: 'Ranipet',         state: 'Tamil Nadu', cities: ['Ranipet', 'Arcot', 'Arakkonam', 'Walajapet', 'Sholinghur'] },
  { district: 'Salem',           state: 'Tamil Nadu', cities: ['Salem', 'Attur', 'Mettur', 'Omalur', 'Sankagiri', 'Edappadi'] },
  { district: 'Sivaganga',       state: 'Tamil Nadu', cities: ['Sivaganga', 'Karaikudi', 'Devakottai', 'Manamadurai', 'Tirupathur'] },
  { district: 'Tenkasi',         state: 'Tamil Nadu', cities: ['Tenkasi', 'Sankarankovil', 'Kadayanallur', 'Shencottai', 'Puliyangudi'] },
  { district: 'Thanjavur',       state: 'Tamil Nadu', cities: ['Thanjavur', 'Kumbakonam', 'Pattukkottai', 'Thiruvaiyaru', 'Orathanadu'] },
  { district: 'Theni',           state: 'Tamil Nadu', cities: ['Theni', 'Bodinayakanur', 'Cumbum', 'Periyakulam', 'Andipatti'] },
  { district: 'Thoothukudi',     state: 'Tamil Nadu', cities: ['Thoothukudi', 'Kovilpatti', 'Tiruchendur', 'Kayalpattinam', 'Ettayapuram'] },
  { district: 'Tiruchirappalli', state: 'Tamil Nadu', cities: ['Tiruchirappalli', 'Srirangam', 'Manapparai', 'Lalgudi', 'Musiri', 'Thuraiyur'] },
  { district: 'Tirunelveli',     state: 'Tamil Nadu', cities: ['Tirunelveli', 'Palayamkottai', 'Ambasamudram', 'Cheranmahadevi', 'Nanguneri'] },
  { district: 'Tirupathur',      state: 'Tamil Nadu', cities: ['Tirupathur', 'Vaniyambadi', 'Ambur', 'Natrampalli'] },
  { district: 'Tiruppur',        state: 'Tamil Nadu', cities: ['Tiruppur', 'Avinashi', 'Udumalaipettai', 'Dharapuram', 'Palladam'] },
  { district: 'Tiruvallur',      state: 'Tamil Nadu', cities: ['Tiruvallur', 'Avadi', 'Ponneri', 'Gummidipoondi', 'Tiruttani', 'Poonamallee'] },
  { district: 'Tiruvannamalai',  state: 'Tamil Nadu', cities: ['Tiruvannamalai', 'Arni', 'Cheyyar', 'Polur', 'Vandavasi'] },
  { district: 'Tiruvarur',       state: 'Tamil Nadu', cities: ['Tiruvarur', 'Mannargudi', 'Thiruthuraipoondi', 'Needamangalam', 'Kodavasal'] },
  { district: 'Vellore',         state: 'Tamil Nadu', cities: ['Vellore', 'Katpadi', 'Gudiyatham', 'Anaicut', 'K.V. Kuppam'] },
  { district: 'Viluppuram',      state: 'Tamil Nadu', cities: ['Viluppuram', 'Tindivanam', 'Gingee', 'Vanur', 'Kandachipuram'] },
  { district: 'Virudhunagar',    state: 'Tamil Nadu', cities: ['Virudhunagar', 'Sivakasi', 'Rajapalayam', 'Sattur', 'Aruppukottai', 'Srivilliputhur'] },

  // ─── Kerala ─────────────────────────────────────────────────────────────────
  { district: 'Alappuzha',          state: 'Kerala', cities: ['Alappuzha', 'Cherthala', 'Kayamkulam', 'Mavelikkara', 'Haripad'] },
  { district: 'Ernakulam',          state: 'Kerala', cities: ['Kochi', 'Ernakulam', 'Aluva', 'Perumbavoor', 'Muvattupuzha', 'Kothamangalam', 'Angamaly'] },
  { district: 'Idukki',             state: 'Kerala', cities: ['Painavu', 'Thodupuzha', 'Munnar', 'Kattappana', 'Nedumkandam'] },
  { district: 'Kannur',             state: 'Kerala', cities: ['Kannur', 'Thalassery', 'Payyanur', 'Iritty', 'Mattannur'] },
  { district: 'Kasaragod',          state: 'Kerala', cities: ['Kasaragod', 'Kanhangad', 'Nileshwaram', 'Manjeshwaram', 'Uppala'] },
  { district: 'Kollam',             state: 'Kerala', cities: ['Kollam', 'Karunagappally', 'Punalur', 'Paravur', 'Kottarakkara'] },
  { district: 'Kottayam',           state: 'Kerala', cities: ['Kottayam', 'Changanassery', 'Pala', 'Vaikom', 'Ettumanoor'] },
  { district: 'Kozhikode',          state: 'Kerala', cities: ['Kozhikode', 'Vadakara', 'Koyilandy', 'Ramanattukara', 'Feroke'] },
  { district: 'Malappuram',         state: 'Kerala', cities: ['Malappuram', 'Manjeri', 'Tirur', 'Ponnani', 'Perinthalmanna', 'Nilambur'] },
  { district: 'Palakkad',           state: 'Kerala', cities: ['Palakkad', 'Ottapalam', 'Chittur', 'Mannarkkad', 'Shoranur', 'Cherpulassery'] },
  { district: 'Pathanamthitta',     state: 'Kerala', cities: ['Pathanamthitta', 'Adoor', 'Thiruvalla', 'Pandalam', 'Ranni'] },
  { district: 'Thiruvananthapuram', state: 'Kerala', cities: ['Thiruvananthapuram', 'Neyyattinkara', 'Attingal', 'Nedumangad', 'Varkala'] },
  { district: 'Thrissur',           state: 'Kerala', cities: ['Thrissur', 'Chalakudy', 'Kodungallur', 'Irinjalakuda', 'Guruvayur', 'Kunnamkulam'] },
  { district: 'Wayanad',            state: 'Kerala', cities: ['Kalpetta', 'Mananthavady', 'Sulthan Bathery', 'Meppadi'] },

  // ─── Karnataka ──────────────────────────────────────────────────────────────
  { district: 'Bagalkot',          state: 'Karnataka', cities: ['Bagalkot', 'Jamkhandi', 'Mudhol', 'Badami', 'Ilkal'] },
  { district: 'Ballari',           state: 'Karnataka', cities: ['Ballari', 'Hospet', 'Sandur', 'Siruguppa', 'Kampli'] },
  { district: 'Belagavi',          state: 'Karnataka', cities: ['Belagavi', 'Gokak', 'Chikodi', 'Bailhongal', 'Athani', 'Nipani'] },
  { district: 'Bengaluru Rural',   state: 'Karnataka', cities: ['Devanahalli', 'Doddaballapura', 'Hoskote', 'Nelamangala'] },
  { district: 'Bengaluru Urban',   state: 'Karnataka', cities: ['Bengaluru', 'Whitefield', 'Electronic City', 'Yelahanka', 'Jayanagar', 'Indiranagar', 'Malleshwaram'] },
  { district: 'Bidar',             state: 'Karnataka', cities: ['Bidar', 'Basavakalyan', 'Bhalki', 'Humnabad', 'Aurad'] },
  { district: 'Chamarajanagar',    state: 'Karnataka', cities: ['Chamarajanagar', 'Kollegal', 'Gundlupet', 'Yelandur'] },
  { district: 'Chikkaballapur',    state: 'Karnataka', cities: ['Chikkaballapur', 'Chintamani', 'Gauribidanur', 'Sidlaghatta', 'Bagepalli'] },
  { district: 'Chikkamagaluru',    state: 'Karnataka', cities: ['Chikkamagaluru', 'Kadur', 'Tarikere', 'Mudigere', 'Sringeri'] },
  { district: 'Chitradurga',       state: 'Karnataka', cities: ['Chitradurga', 'Hiriyur', 'Challakere', 'Hosadurga', 'Molakalmuru'] },
  { district: 'Dakshina Kannada',  state: 'Karnataka', cities: ['Mangaluru', 'Puttur', 'Bantwal', 'Sullia', 'Moodabidri', 'Ullal'] },
  { district: 'Davanagere',        state: 'Karnataka', cities: ['Davanagere', 'Harihar', 'Channagiri', 'Honnali', 'Jagalur'] },
  { district: 'Dharwad',           state: 'Karnataka', cities: ['Dharwad', 'Hubballi', 'Kalghatgi', 'Navalgund', 'Kundgol'] },
  { district: 'Gadag',             state: 'Karnataka', cities: ['Gadag', 'Betageri', 'Ron', 'Nargund', 'Lakshmeshwar'] },
  { district: 'Hassan',            state: 'Karnataka', cities: ['Hassan', 'Arsikere', 'Channarayapatna', 'Holenarasipura', 'Sakleshpur'] },
  { district: 'Haveri',            state: 'Karnataka', cities: ['Haveri', 'Ranebennur', 'Byadgi', 'Savanur', 'Hangal'] },
  { district: 'Kalaburagi',        state: 'Karnataka', cities: ['Kalaburagi', 'Sedam', 'Chincholi', 'Aland', 'Chittapur'] },
  { district: 'Kodagu',            state: 'Karnataka', cities: ['Madikeri', 'Virajpet', 'Somwarpet', 'Kushalnagar'] },
  { district: 'Kolar',             state: 'Karnataka', cities: ['Kolar', 'Kolar Gold Fields', 'Malur', 'Bangarapet', 'Mulbagal'] },
  { district: 'Koppal',            state: 'Karnataka', cities: ['Koppal', 'Gangavathi', 'Yelburga', 'Kushtagi', 'Kanakagiri'] },
  { district: 'Mandya',            state: 'Karnataka', cities: ['Mandya', 'Maddur', 'Malavalli', 'Srirangapatna', 'Nagamangala', 'Pandavapura'] },
  { district: 'Mysuru',            state: 'Karnataka', cities: ['Mysuru', 'Nanjangud', 'Hunsur', 'T. Narasipura', 'Krishnarajanagara', 'Piriyapatna'] },
  { district: 'Raichur',           state: 'Karnataka', cities: ['Raichur', 'Sindhanur', 'Manvi', 'Lingsugur', 'Devadurga'] },
  { district: 'Ramanagara',        state: 'Karnataka', cities: ['Ramanagara', 'Channapatna', 'Kanakapura', 'Magadi'] },
  { district: 'Shivamogga',        state: 'Karnataka', cities: ['Shivamogga', 'Bhadravati', 'Sagar', 'Shikaripura', 'Sorab', 'Thirthahalli'] },
  { district: 'Tumakuru',          state: 'Karnataka', cities: ['Tumakuru', 'Tiptur', 'Sira', 'Madhugiri', 'Kunigal', 'Gubbi'] },
  { district: 'Udupi',             state: 'Karnataka', cities: ['Udupi', 'Kundapura', 'Karkala', 'Kaup', 'Byndoor'] },
  { district: 'Uttara Kannada',    state: 'Karnataka', cities: ['Karwar', 'Sirsi', 'Bhatkal', 'Kumta', 'Dandeli', 'Honnavar'] },
  { district: 'Vijayanagara',      state: 'Karnataka', cities: ['Hosapete', 'Hampi', 'Kottur', 'Hagaribommanahalli', 'Harapanahalli'] },
  { district: 'Vijayapura',        state: 'Karnataka', cities: ['Vijayapura', 'Indi', 'Sindagi', 'Basavana Bagewadi', 'Muddebihal'] },
  { district: 'Yadgir',            state: 'Karnataka', cities: ['Yadgir', 'Shahapur', 'Surpur', 'Gurmitkal'] },

  // ─── Andhra Pradesh ─────────────────────────────────────────────────────────
  { district: 'Alluri Sitharama Raju', state: 'Andhra Pradesh', cities: ['Paderu', 'Chintapalle', 'Rampachodavaram', 'Araku Valley'] },
  { district: 'Anakapalli',        state: 'Andhra Pradesh', cities: ['Anakapalli', 'Narsipatnam', 'Yelamanchili', 'Chodavaram'] },
  { district: 'Ananthapuramu',     state: 'Andhra Pradesh', cities: ['Anantapur', 'Hindupur', 'Guntakal', 'Tadipatri', 'Kalyandurg'] },
  { district: 'Annamayya',         state: 'Andhra Pradesh', cities: ['Rayachoti', 'Madanapalle', 'Rajampet', 'Pileru'] },
  { district: 'Bapatla',           state: 'Andhra Pradesh', cities: ['Bapatla', 'Chirala', 'Repalle', 'Addanki'] },
  { district: 'Chittoor',          state: 'Andhra Pradesh', cities: ['Chittoor', 'Palamaner', 'Nagari', 'Kuppam', 'Punganur'] },
  { district: 'East Godavari',     state: 'Andhra Pradesh', cities: ['Rajahmundry', 'Kovvur', 'Nidadavole', 'Kadiam'] },
  { district: 'Eluru',             state: 'Andhra Pradesh', cities: ['Eluru', 'Jangareddygudem', 'Nuzvid', 'Chintalapudi'] },
  { district: 'Guntur',            state: 'Andhra Pradesh', cities: ['Guntur', 'Tenali', 'Ponnur', 'Mangalagiri', 'Tadepalle'] },
  { district: 'Kakinada',          state: 'Andhra Pradesh', cities: ['Kakinada', 'Samalkota', 'Pithapuram', 'Peddapuram', 'Tuni'] },
  { district: 'Konaseema',         state: 'Andhra Pradesh', cities: ['Amalapuram', 'Ramachandrapuram', 'Mummidivaram', 'Razole'] },
  { district: 'Krishna',           state: 'Andhra Pradesh', cities: ['Machilipatnam', 'Gudivada', 'Pedana', 'Avanigadda'] },
  { district: 'Kurnool',           state: 'Andhra Pradesh', cities: ['Kurnool', 'Adoni', 'Yemmiganur', 'Nandikotkur', 'Dhone'] },
  { district: 'Nandyal',           state: 'Andhra Pradesh', cities: ['Nandyal', 'Allagadda', 'Atmakur', 'Banaganapalle', 'Dhone'] },
  { district: 'NTR',               state: 'Andhra Pradesh', cities: ['Vijayawada', 'Nandigama', 'Jaggayyapeta', 'Tiruvuru'] },
  { district: 'Palnadu',           state: 'Andhra Pradesh', cities: ['Narasaraopet', 'Sattenapalle', 'Gurazala', 'Macherla', 'Piduguralla'] },
  { district: 'Parvathipuram Manyam', state: 'Andhra Pradesh', cities: ['Parvathipuram', 'Palakonda', 'Salur', 'Bobbili'] },
  { district: 'Prakasam',          state: 'Andhra Pradesh', cities: ['Ongole', 'Chirala', 'Markapur', 'Kandukur', 'Giddalur'] },
  { district: 'Sri Potti Sriramulu Nellore', state: 'Andhra Pradesh', cities: ['Nellore', 'Kavali', 'Gudur', 'Atmakur', 'Sullurpeta'] },
  { district: 'Sri Sathya Sai',    state: 'Andhra Pradesh', cities: ['Puttaparthi', 'Dharmavaram', 'Kadiri', 'Penukonda', 'Hindupur'] },
  { district: 'Srikakulam',        state: 'Andhra Pradesh', cities: ['Srikakulam', 'Amadalavalasa', 'Palasa', 'Ichchapuram', 'Tekkali'] },
  { district: 'Tirupati',          state: 'Andhra Pradesh', cities: ['Tirupati', 'Srikalahasti', 'Chandragiri', 'Puttur', 'Sullurpeta'] },
  { district: 'Visakhapatnam',     state: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Bheemunipatnam', 'Gajuwaka', 'Anandapuram'] },
  { district: 'Vizianagaram',      state: 'Andhra Pradesh', cities: ['Vizianagaram', 'Bobbili', 'Cheepurupalli', 'Gajapathinagaram', 'Nellimarla'] },
  { district: 'West Godavari',     state: 'Andhra Pradesh', cities: ['Bhimavaram', 'Tadepalligudem', 'Tanuku', 'Narsapur', 'Palakollu'] },
  { district: 'YSR Kadapa',        state: 'Andhra Pradesh', cities: ['Kadapa', 'Proddatur', 'Pulivendula', 'Jammalamadugu', 'Mydukur'] },

  // ─── Telangana ──────────────────────────────────────────────────────────────
  { district: 'Adilabad',          state: 'Telangana', cities: ['Adilabad', 'Bhainsa', 'Nirmal', 'Utnoor'] },
  { district: 'Bhadradri Kothagudem', state: 'Telangana', cities: ['Kothagudem', 'Bhadrachalam', 'Palvancha', 'Manuguru', 'Yellandu'] },
  { district: 'Hanumakonda',       state: 'Telangana', cities: ['Hanumakonda', 'Kazipet', 'Elkathurthi', 'Parkal'] },
  { district: 'Hyderabad',         state: 'Telangana', cities: ['Hyderabad', 'Secunderabad', 'Charminar', 'Amberpet', 'Nampally'] },
  { district: 'Jagtial',           state: 'Telangana', cities: ['Jagtial', 'Korutla', 'Metpally', 'Dharmapuri'] },
  { district: 'Jangaon',           state: 'Telangana', cities: ['Jangaon', 'Ghanpur', 'Palakurthi', 'Devaruppula'] },
  { district: 'Jayashankar Bhupalpally', state: 'Telangana', cities: ['Bhupalpally', 'Malharrao', 'Ghanpur', 'Chityal'] },
  { district: 'Jogulamba Gadwal',  state: 'Telangana', cities: ['Gadwal', 'Alampur', 'Aiza', 'Ieej'] },
  { district: 'Kamareddy',         state: 'Telangana', cities: ['Kamareddy', 'Banswada', 'Yellareddy', 'Bhiknoor'] },
  { district: 'Karimnagar',        state: 'Telangana', cities: ['Karimnagar', 'Jammikunta', 'Huzurabad', 'Choppadandi'] },
  { district: 'Khammam',           state: 'Telangana', cities: ['Khammam', 'Sathupalli', 'Madhira', 'Wyra', 'Kallur'] },
  { district: 'Komaram Bheem Asifabad', state: 'Telangana', cities: ['Asifabad', 'Kagaznagar', 'Sirpur', 'Bellampalli'] },
  { district: 'Mahabubabad',       state: 'Telangana', cities: ['Mahabubabad', 'Thorrur', 'Dornakal', 'Kesamudram'] },
  { district: 'Mahabubnagar',      state: 'Telangana', cities: ['Mahabubnagar', 'Jadcherla', 'Bhoothpur', 'Devarkadra'] },
  { district: 'Mancherial',        state: 'Telangana', cities: ['Mancherial', 'Bellampalli', 'Naspur', 'Luxettipet', 'Chennur'] },
  { district: 'Medak',             state: 'Telangana', cities: ['Medak', 'Toopran', 'Narsapur', 'Ramayampet'] },
  { district: 'Medchal–Malkajgiri', state: 'Telangana', cities: ['Medchal', 'Malkajgiri', 'Kompally', 'Kukatpally', 'Uppal'] },
  { district: 'Mulugu',            state: 'Telangana', cities: ['Mulugu', 'Eturnagaram', 'Venkatapur', 'Tadvai'] },
  { district: 'Nagarkurnool',      state: 'Telangana', cities: ['Nagarkurnool', 'Kalwakurthy', 'Achampet', 'Kollapur'] },
  { district: 'Nalgonda',          state: 'Telangana', cities: ['Nalgonda', 'Miryalaguda', 'Devarakonda', 'Nakrekal', 'Nidamanuru'] },
  { district: 'Narayanpet',        state: 'Telangana', cities: ['Narayanpet', 'Makthal', 'Kosgi', 'Maganoor'] },
  { district: 'Nirmal',            state: 'Telangana', cities: ['Nirmal', 'Bhainsa', 'Khanapur', 'Mudhole'] },
  { district: 'Nizamabad',         state: 'Telangana', cities: ['Nizamabad', 'Bodhan', 'Armoor', 'Kamareddy'] },
  { district: 'Peddapalli',        state: 'Telangana', cities: ['Peddapalli', 'Ramagundam', 'Godavarikhani', 'Manthani', 'Sultanabad'] },
  { district: 'Rajanna Sircilla',  state: 'Telangana', cities: ['Sircilla', 'Vemulawada', 'Konaraopeta', 'Ellanthakunta'] },
  { district: 'Rangareddy',        state: 'Telangana', cities: ['Shamshabad', 'Ibrahimpatnam', 'Chevella', 'Rajendranagar', 'Maheshwaram'] },
  { district: 'Sangareddy',        state: 'Telangana', cities: ['Sangareddy', 'Zaheerabad', 'Patancheru', 'Sadasivpet', 'Narayankhed'] },
  { district: 'Siddipet',          state: 'Telangana', cities: ['Siddipet', 'Gajwel', 'Husnabad', 'Dubbak', 'Cherial'] },
  { district: 'Suryapet',          state: 'Telangana', cities: ['Suryapet', 'Kodad', 'Huzurnagar', 'Thungathurthi'] },
  { district: 'Vikarabad',         state: 'Telangana', cities: ['Vikarabad', 'Tandur', 'Parigi', 'Kodangal'] },
  { district: 'Wanaparthy',        state: 'Telangana', cities: ['Wanaparthy', 'Kothakota', 'Atmakur', 'Pebbair'] },
  { district: 'Warangal',          state: 'Telangana', cities: ['Warangal', 'Narsampet', 'Wardhannapet', 'Parvathagiri'] },
  { district: 'Yadadri Bhuvanagiri', state: 'Telangana', cities: ['Bhongir', 'Yadagirigutta', 'Alair', 'Choutuppal'] },
]

// ─── Lookups ──────────────────────────────────────────────────────────────────

const CITIES_BY_DISTRICT = new Map(
  SOUTH_INDIA_DISTRICTS.map((d) => [d.district, d.cities])
)

/** District options for the combobox, labelled with their state, sorted A→Z. */
export function getDistrictOptions(): { value: string; label: string }[] {
  return [...SOUTH_INDIA_DISTRICTS]
    .sort((a, b) => a.district.localeCompare(b.district))
    .map((d) => ({ value: d.district, label: `${d.district}, ${d.state}` }))
}

/** City options for a given district (empty if the district is unknown). */
export function getCityOptions(district: string): { value: string; label: string }[] {
  const cities = CITIES_BY_DISTRICT.get(district) ?? []
  return cities.map((c) => ({ value: c, label: c }))
}
