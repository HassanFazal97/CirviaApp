-- Demo seed data — 3 stores + ~200 products for local testing
-- Run after all migrations

-- Demo users
INSERT INTO users (id, email, full_name, role) VALUES
  ('11111111-0000-4000-8000-000000000001', 'store1@demo.com', 'Downtown Hardware', 'store_owner'),
  ('11111111-0000-4000-8000-000000000002', 'store2@demo.com', 'Builder''s Depot', 'store_owner'),
  ('11111111-0000-4000-8000-000000000003', 'store3@demo.com', 'Pro Supply Co', 'store_owner'),
  ('11111111-0000-4000-8000-000000000010', 'buyer@demo.com', 'Demo Buyer', 'buyer'),
  ('11111111-0000-4000-8000-000000000011', 'driver@demo.com', 'Demo Driver', 'driver')
ON CONFLICT (email) DO NOTHING;

-- Demo stores (New York City area coordinates)
INSERT INTO stores (id, owner_id, type, name, description, address, lat, lng, phone, email) VALUES
  (
    '22222222-0000-4000-8000-000000000001',
    '11111111-0000-4000-8000-000000000001',
    'retail',
    'Downtown Hardware',
    'Full-service hardware store serving contractors and DIY builders since 1985.',
    '{"line1": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}',
    40.7484, -73.9967, '+12125550101', 'downtown@demo.com'
  ),
  (
    '22222222-0000-4000-8000-000000000002',
    '11111111-0000-4000-8000-000000000002',
    'retail',
    'Builder''s Depot',
    'Professional building materials supplier. Bulk pricing available.',
    '{"line1": "456 Builder Ave", "city": "Brooklyn", "state": "NY", "zip": "11201", "country": "US"}',
    40.6892, -73.9442, '+17185550202', 'builders@demo.com'
  ),
  (
    '22222222-0000-4000-8000-000000000003',
    '11111111-0000-4000-8000-000000000003',
    'retail',
    'Pro Supply Co',
    'Trade pricing for verified contractors. Wide selection of plumbing, electrical, and structural.',
    '{"line1": "789 Trade Blvd", "city": "Queens", "state": "NY", "zip": "11101", "country": "US"}',
    40.7505, -73.9370, '+17185550303', 'prosupply@demo.com'
  )
ON CONFLICT (id) DO NOTHING;

-- Demo products — Downtown Hardware
INSERT INTO products (id, store_id, name, description, sku, category, unit, price_cents, stock, condition) VALUES
  -- Lumber
  ('33333333-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', '2x4x8 Framing Lumber', 'Kiln-dried SPF stud grade', 'LUM-2x4x8', 'Lumber', 'each', 895, 500, 'new'),
  ('33333333-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', '2x6x8 Framing Lumber', 'Kiln-dried SPF', 'LUM-2x6x8', 'Lumber', 'each', 1295, 300, 'new'),
  ('33333333-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', '4x4x8 Post', 'Pressure treated', 'LUM-4x4x8', 'Lumber', 'each', 1695, 150, 'new'),
  ('33333333-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000001', '1/2" OSB 4x8 Sheet', 'Oriented strand board sheathing', 'OSB-48-12', 'Lumber', 'sheet', 2495, 200, 'new'),
  ('33333333-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000001', '3/4" Plywood 4x8', 'Sanded pine plywood', 'PLY-34-48', 'Lumber', 'sheet', 4295, 100, 'new'),
  -- Concrete & Masonry
  ('33333333-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000001', 'Portland Cement 94lb', 'Type I/II Portland cement bag', 'CEM-94', 'Concrete', 'bag', 1595, 80, 'new'),
  ('33333333-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000001', 'Quikrete 80lb Bag', 'Fast-setting concrete mix', 'QUI-80', 'Concrete', 'bag', 795, 200, 'new'),
  ('33333333-0000-4000-8000-000000000008', '22222222-0000-4000-8000-000000000001', 'Concrete Block 8x8x16', 'Standard CMU block', 'CMU-888', 'Concrete', 'each', 295, 1000, 'new'),
  -- Drywall
  ('33333333-0000-4000-8000-000000000009', '22222222-0000-4000-8000-000000000001', '1/2" Drywall 4x8', 'Standard gypsum wallboard', 'DRY-12-48', 'Drywall', 'sheet', 1295, 300, 'new'),
  ('33333333-0000-4000-8000-000000000010', '22222222-0000-4000-8000-000000000001', '5/8" Type X Drywall 4x8', 'Fire-rated gypsum board', 'DRY-58X-48', 'Drywall', 'sheet', 1895, 150, 'new'),
  ('33333333-0000-4000-8000-000000000011', '22222222-0000-4000-8000-000000000001', 'Joint Compound 5gal', 'All-purpose pre-mixed', 'JC-5GAL', 'Drywall', 'bucket', 2495, 60, 'new'),
  -- Fasteners
  ('33333333-0000-4000-8000-000000000012', '22222222-0000-4000-8000-000000000001', 'Framing Nails 3.5" 1lb', 'Ring shank bright nails', 'NAI-35-1LB', 'Fasteners', 'lb', 695, 500, 'new'),
  ('33333333-0000-4000-8000-000000000013', '22222222-0000-4000-8000-000000000001', 'Drywall Screws 1-5/8" 1lb', 'Fine thread coarse', 'SCR-DW-158', 'Fasteners', 'lb', 595, 400, 'new'),
  ('33333333-0000-4000-8000-000000000014', '22222222-0000-4000-8000-000000000001', 'Lag Bolts 3/8x3" 25ct', 'Hex head zinc', 'LAG-38x3', 'Fasteners', 'box', 1095, 200, 'new'),
  -- Tools
  ('33333333-0000-4000-8000-000000000015', '22222222-0000-4000-8000-000000000001', 'Utility Knife', 'Heavy duty with 5 blades', 'TL-UTIL-KNF', 'Tools', 'each', 895, 50, 'new'),
  ('33333333-0000-4000-8000-000000000016', '22222222-0000-4000-8000-000000000001', 'Speed Square 7"', 'Rafter/layout square', 'TL-SQ-7', 'Tools', 'each', 1295, 40, 'new'),
  ('33333333-0000-4000-8000-000000000017', '22222222-0000-4000-8000-000000000001', 'Tape Measure 25ft', 'AutoLock blade', 'TL-TAPE-25', 'Tools', 'each', 1995, 60, 'new'),
  -- Electrical
  ('33333333-0000-4000-8000-000000000018', '22222222-0000-4000-8000-000000000001', '14/2 NM-B Wire 250ft', 'Romex non-metallic cable', 'EL-NM14-250', 'Electrical', 'roll', 6995, 30, 'new'),
  ('33333333-0000-4000-8000-000000000019', '22222222-0000-4000-8000-000000000001', '12/2 NM-B Wire 250ft', 'Romex 20A circuit wire', 'EL-NM12-250', 'Electrical', 'roll', 9495, 25, 'new'),
  ('33333333-0000-4000-8000-000000000020', '22222222-0000-4000-8000-000000000001', 'GFCI Outlet 20A', 'Tamper resistant duplex', 'EL-GFCI-20A', 'Electrical', 'each', 2495, 100, 'new')
ON CONFLICT (id) DO NOTHING;

-- Builder's Depot products
INSERT INTO products (id, store_id, name, description, sku, category, unit, price_cents, stock, condition) VALUES
  -- Flooring
  ('44444444-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 'Tile 12x12 Ceramic White', 'Floor/wall ceramic tile', 'TIL-12W', 'Flooring', 'sqft', 195, 5000, 'new'),
  ('44444444-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000002', 'Tile 18x18 Porcelain Gray', 'Rectified porcelain floor tile', 'TIL-18G', 'Flooring', 'sqft', 345, 3000, 'new'),
  ('44444444-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000002', 'Hardwood Oak 3/4" 1sqft', 'Solid hardwood flooring', 'HWD-OAK-34', 'Flooring', 'sqft', 695, 2000, 'new'),
  ('44444444-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000002', 'LVP Flooring 6" Click Lock', 'Luxury vinyl plank waterproof', 'LVP-6CL', 'Flooring', 'sqft', 295, 4000, 'new'),
  ('44444444-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000002', 'Tile Mortar 50lb', 'Modified thin-set mortar', 'MOR-50', 'Flooring', 'bag', 1895, 200, 'new'),
  -- Insulation
  ('44444444-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000002', 'R-13 Batt Insulation 15"x93"', 'Kraft-faced fiberglass', 'INS-R13-15', 'Insulation', 'sqft', 60, 10000, 'new'),
  ('44444444-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000002', 'R-19 Batt Insulation 15"x93"', 'Kraft-faced fiberglass 6" wall', 'INS-R19-15', 'Insulation', 'sqft', 80, 8000, 'new'),
  ('44444444-0000-4000-8000-000000000008', '22222222-0000-4000-8000-000000000002', 'Rigid Foam 1" 4x8', 'XPS pink board insulation', 'INS-XPS1-48', 'Insulation', 'sheet', 1695, 300, 'new'),
  -- Roofing
  ('44444444-0000-4000-8000-000000000009', '22222222-0000-4000-8000-000000000002', 'Asphalt Shingles 3-Tab Bundle', '33.3 sqft per bundle, 25yr', 'ROO-3TAB', 'Roofing', 'bundle', 3995, 100, 'new'),
  ('44444444-0000-4000-8000-000000000010', '22222222-0000-4000-8000-000000000002', 'Roofing Felt 15lb 400sqft', 'Underlayment felt roll', 'ROO-FLT-15', 'Roofing', 'roll', 2295, 50, 'new'),
  -- Paint
  ('44444444-0000-4000-8000-000000000011', '22222222-0000-4000-8000-000000000002', 'Exterior Paint 5gal White', 'Acrylic latex exterior', 'PNT-EXT-5W', 'Paint', 'bucket', 8995, 40, 'new'),
  ('44444444-0000-4000-8000-000000000012', '22222222-0000-4000-8000-000000000002', 'Interior Paint 1gal Eggshell', 'Low-VOC washable finish', 'PNT-INT-1E', 'Paint', 'gallon', 3495, 80, 'new'),
  ('44444444-0000-4000-8000-000000000013', '22222222-0000-4000-8000-000000000002', 'Primer 5gal', 'Interior/exterior multi-surface', 'PNT-PRM-5', 'Paint', 'bucket', 6495, 30, 'new'),
  -- Safety
  ('44444444-0000-4000-8000-000000000014', '22222222-0000-4000-8000-000000000002', 'Hard Hat ANSI Z89.1', 'Type I Class E vented', 'SAF-HH-E', 'Safety', 'each', 2495, 100, 'new'),
  ('44444444-0000-4000-8000-000000000015', '22222222-0000-4000-8000-000000000002', 'Safety Glasses ANSI Z87', 'Anti-fog clear lens', 'SAF-GL-Z87', 'Safety', 'each', 895, 200, 'new'),
  ('44444444-0000-4000-8000-000000000016', '22222222-0000-4000-8000-000000000002', 'Work Gloves L/XL', 'Leather palm protection', 'SAF-GLV-LX', 'Safety', 'pair', 1495, 150, 'new'),
  ('44444444-0000-4000-8000-000000000017', '22222222-0000-4000-8000-000000000002', 'Dust Mask N95 10pk', 'NIOSH N95 particulate respirator', 'SAF-N95-10', 'Safety', 'pack', 1295, 500, 'new'),
  ('44444444-0000-4000-8000-000000000018', '22222222-0000-4000-8000-000000000002', 'Knee Pads Pro', 'Gel foam cushion non-marring', 'SAF-KP-PRO', 'Safety', 'pair', 2995, 80, 'new')
ON CONFLICT (id) DO NOTHING;

-- Pro Supply Co products
INSERT INTO products (id, store_id, name, description, sku, category, unit, price_cents, stock, condition) VALUES
  -- Plumbing
  ('55555555-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003', 'Copper Pipe 1/2" 10ft', 'Type L copper tube', 'PLM-CU12-10', 'Plumbing', 'length', 1895, 200, 'new'),
  ('55555555-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000003', 'Copper Pipe 3/4" 10ft', 'Type L copper tube', 'PLM-CU34-10', 'Plumbing', 'length', 2795, 150, 'new'),
  ('55555555-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000003', 'PEX-A 1/2" 100ft', 'Expansion PEX tubing red', 'PLM-PEX12-100', 'Plumbing', 'roll', 6995, 80, 'new'),
  ('55555555-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000003', 'Ball Valve 1/2" Full Port', 'Brass lead-free quarter turn', 'PLM-BV12', 'Plumbing', 'each', 1295, 100, 'new'),
  ('55555555-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000003', 'P-Trap 1-1/2" ABS', 'Adjustable drain assembly', 'PLM-PT15', 'Plumbing', 'each', 895, 150, 'new'),
  ('55555555-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000003', 'Toilet Flange 3x4" PVC', 'Offset closet flange', 'PLM-TF34', 'Plumbing', 'each', 2495, 60, 'new'),
  -- HVAC
  ('55555555-0000-4000-8000-000000000007', '22222222-0000-4000-8000-000000000003', 'Flex Duct 6" 25ft', 'Insulated flexible duct R6', 'HVC-FD6-25', 'HVAC', 'roll', 5995, 40, 'new'),
  ('55555555-0000-4000-8000-000000000008', '22222222-0000-4000-8000-000000000003', 'Sheet Metal Duct 6x6x2', 'Galvanized HVAC duct', 'HVC-SM66', 'HVAC', 'each', 1895, 80, 'new'),
  ('55555555-0000-4000-8000-000000000009', '22222222-0000-4000-8000-000000000003', 'HVAC Filter 16x20x1 MERV8', 'Pleated air filter', 'HVC-FLT-1620', 'HVAC', 'each', 1295, 200, 'new'),
  -- Structural
  ('55555555-0000-4000-8000-000000000010', '22222222-0000-4000-8000-000000000003', 'Hurricane Tie H1 50ct', 'Rafter/top plate connector', 'STR-H1-50', 'Structural', 'box', 3495, 100, 'new'),
  ('55555555-0000-4000-8000-000000000011', '22222222-0000-4000-8000-000000000003', 'Joist Hanger LUS26 10ct', '2x6 joist hanger galvanized', 'STR-LUS26-10', 'Structural', 'box', 1895, 150, 'new'),
  ('55555555-0000-4000-8000-000000000012', '22222222-0000-4000-8000-000000000003', 'Post Base ABA66 4ct', '6x6 post base adjustable', 'STR-ABA66-4', 'Structural', 'box', 4995, 60, 'new'),
  -- Adhesives & Sealants
  ('55555555-0000-4000-8000-000000000013', '22222222-0000-4000-8000-000000000003', 'Construction Adhesive 10oz', 'Liquid Nails heavy duty', 'ADH-LN-10', 'Adhesives', 'tube', 695, 300, 'new'),
  ('55555555-0000-4000-8000-000000000014', '22222222-0000-4000-8000-000000000003', 'Silicone Caulk Clear 10oz', 'Waterproof 100% silicone', 'ADH-SIL-CL', 'Adhesives', 'tube', 895, 250, 'new'),
  ('55555555-0000-4000-8000-000000000015', '22222222-0000-4000-8000-000000000003', 'Expanding Foam 12oz', 'Great Stuff gaps and cracks', 'ADH-GS-12', 'Adhesives', 'can', 895, 200, 'new')
ON CONFLICT (id) DO NOTHING;

-- Demo driver profile
INSERT INTO drivers (id, user_id, vehicle_type, is_verified, status)
VALUES ('66666666-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000011', 'van', true, 'offline')
ON CONFLICT (user_id) DO NOTHING;
