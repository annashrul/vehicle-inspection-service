UPDATE inspections SET client_id = gen_random_uuid() WHERE client_id IS NULL;
