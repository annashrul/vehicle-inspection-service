package com.logique.inspection;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="audit_outbox")
public class AuditEvent {
    @Id public UUID id;
    @Column(name="inspection_id") public Long inspectionId;
    @Column(nullable=false, columnDefinition="text") public String payload;
    @Column(name="created_at", nullable=false) public Instant createdAt;
    @Column(name="delivered_at") public Instant deliveredAt;
}
