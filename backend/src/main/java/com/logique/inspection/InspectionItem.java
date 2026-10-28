package com.logique.inspection;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.ArrayList;
import java.util.List;

@Embeddable
public class InspectionItem {
    @Column(name="point_code", nullable=false, length=60) public String pointCode;
    @Column(name="item_condition", nullable=false, length=30) public String condition;
    @Column(columnDefinition="text") public String note;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="photo_refs", nullable=false, columnDefinition="jsonb")
    public List<String> photoRefs = new ArrayList<>();
    public InspectionItem() {}
    public InspectionItem(Api.Item item) {
        pointCode=item.pointCode(); condition=item.condition(); note=item.note();
        photoRefs=new ArrayList<>(item.photoRefs());
    }
    public Api.Item dto() { return new Api.Item(pointCode, condition, note, List.copyOf(photoRefs)); }
}
