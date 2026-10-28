package com.logique.inspection;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class VehicleRepository implements PanacheRepository<Vehicle> {
    public void require(Long id) {
        if (id == null) throw ApiException.error(400,"vehicle_id","Vehicle is required");
        if (findById(id) == null) throw ApiException.error(404,"vehicle_id","Vehicle not found");
    }
}
