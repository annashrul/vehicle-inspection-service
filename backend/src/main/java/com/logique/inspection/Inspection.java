package com.logique.inspection;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name="inspections")
public class Inspection {
    @Id @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="inspection_ids")
    @SequenceGenerator(name="inspection_ids", sequenceName="inspections_seq", allocationSize=1)
    public Long id;
    @Column(name="vehicle_id", nullable=false) public Long vehicleId;
    @Column(name="client_id", unique=true) public UUID clientId;
    @Column(name="inspector_name", nullable=false, length=200) public String inspectorName;
    @Column(name="has_key", nullable=false) public boolean hasKey;
    @Column(nullable=false, length=20) public String status;
    // Explicit version updates while holding row locks keep retry/no-op semantics unambiguous.
    @Column(nullable=false) public int version;
    @Column(name="created_at", nullable=false) public Instant createdAt;
    @Column(name="updated_at", nullable=false) public Instant updatedAt;
    @ElementCollection @CollectionTable(name="inspection_items", joinColumns=@JoinColumn(name="inspection_id"))
    public List<InspectionItem> items = new ArrayList<>();
    public Api.Detail dto() {
        return new Api.Detail(id, vehicleId, clientId, inspectorName, hasKey, status, version,
            createdAt, updatedAt, items.stream().map(InspectionItem::dto).sorted(Comparator.comparing(Api.Item::pointCode)).toList());
    }
}
