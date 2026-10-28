package com.logique.inspection;

import jakarta.persistence.*;

@Entity @Table(name = "vehicles")
public class Vehicle {
    @Id public Long id;
    @Column(name="plate_number", nullable=false, unique=true, length=30) @com.fasterxml.jackson.annotation.JsonProperty("plate_number") public String plateNumber;
    @Column(nullable=false, length=20) public String type;
    @Column(nullable=false, length=80) public String brand;
    @Column(nullable=false, length=80) public String model;
    @Column(nullable=false) public int year;
}
