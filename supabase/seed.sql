-- Example deals (marked is_example). Prices are illustrations, not quotes.
insert into public.deals (category, title, area, city, market_price, target, deposit, closes_at, tiers, is_example, example_pledges) values
('solar', '{"en":"3 kW rooftop solar · Satellite societies","hi":"3 kW रूफटॉप सोलर · सैटेलाइट सोसाइटी"}', '{"en":"Satellite, Ahmedabad","hi":"सैटेलाइट, अहमदाबाद"}',
 'Ahmedabad', 190000, 40, 5000, now() + interval '12 days', '[{"minBuyers":10,"price":180000},{"minBuyers":25,"price":172000},{"minBuyers":40,"price":165000}]', true, 27),
('solar', '{"en":"5 kW rooftop solar · Bopal bungalows","hi":"5 kW रूफटॉप सोलर · बोपल बंगले"}', '{"en":"Bopal, Ahmedabad","hi":"बोपल, अहमदाबाद"}',
 'Ahmedabad', 290000, 30, 5000, now() + interval '5 days', '[{"minBuyers":10,"price":281000},{"minBuyers":20,"price":272000},{"minBuyers":30,"price":261000}]', true, 30);

-- Make yourself admin after signing in once:
-- update public.profiles set role = 'admin' where phone = '91XXXXXXXXXX';
