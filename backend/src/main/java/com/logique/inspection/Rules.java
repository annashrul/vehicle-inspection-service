package com.logique.inspection;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.util.*;
import static com.logique.inspection.Api.*;

@ApplicationScoped
public class Rules {
    public static final Set<String> STATUSES=Set.of("DRAFT","SUBMITTED","RECHECK","APPROVED");
    public static final Set<String> CONDITIONS=Set.of("GOOD","MINOR_DAMAGE","MAJOR_DAMAGE","NOT_INSPECTABLE");
    private final Map<String,String> points = new LinkedHashMap<>();
    @Inject ObjectMapper mapper;
    @PostConstruct void load() {
        try (var in = getClass().getResourceAsStream("/checklist.json")) {
            for (var point : mapper.readTree(in).path("vehicle_types").path("CAR"))
                points.put(point.path("point_code").asText(), point.path("section").asText());
        } catch (IOException e) { throw new IllegalStateException("Cannot load checklist",e); }
        if (points.size()!=14) throw new IllegalStateException("Expected 14 checklist points");
    }
    public List<Item> validate(String name, Boolean hasKey, List<Item> items, boolean submitted) {
        var errors = new ArrayList<FieldError>();
        if (name==null || name.isBlank() || name.length()>200) errors.add(new FieldError("inspector_name","Required, maximum 200 characters"));
        if (hasKey==null) errors.add(new FieldError("has_key","Boolean is required"));
        var seen = new HashSet<String>();
        var normalized = new ArrayList<Item>();
        if (items != null) for (int i=0;i<items.size();i++) {
            Item item=items.get(i);
            String field="items."+i;
            if (item==null) { errors.add(new FieldError(field,"Item must be an object")); continue; }
            String code=item.pointCode();
            if (!points.containsKey(code)) errors.add(new FieldError(field+".point_code","Unknown checklist point"));
            else field="items."+code;
            if (!seen.add(code)) errors.add(new FieldError(field+".point_code","Duplicate point"));
            if (item.condition()==null || !CONDITIONS.contains(item.condition())) errors.add(new FieldError(field+".condition","Invalid condition"));
            if (Boolean.FALSE.equals(hasKey) && "ENGINE".equals(points.get(code)) && !"NOT_INSPECTABLE".equals(item.condition()))
                errors.add(new FieldError(field+".condition","ENGINE requires NOT_INSPECTABLE without a key"));
            if ("NOT_INSPECTABLE".equals(item.condition()) && (item.note()==null || item.note().isBlank()))
                errors.add(new FieldError(field+".note","Note is required for NOT_INSPECTABLE"));
            List<String> photos=item.photoRefs()==null ? List.of() : item.photoRefs();
            if (photos.stream().anyMatch(p -> p==null || p.isBlank())) errors.add(new FieldError(field+".photo_refs","Photo references must be nonblank strings"));
            if ("MAJOR_DAMAGE".equals(item.condition()) && photos.isEmpty()) errors.add(new FieldError(field+".photo_refs","At least one photo is required for MAJOR_DAMAGE"));
            normalized.add(new Item(code,item.condition(),item.note(),photos));
        }
        if (submitted) for (String code:points.keySet()) if (!seen.contains(code)) errors.add(new FieldError("items."+code,"Checklist point is required for SUBMITTED"));
        if (!errors.isEmpty()) throw new ApiException(400,"Validation failed",errors);
        return canonical(normalized);
    }
    public List<Item> canonical(List<Item> items) {
        if (items==null) return List.of();
        return items.stream().map(i -> new Item(i.pointCode(),i.condition(),i.note(),
                i.photoRefs()==null ? List.of() : i.photoRefs().stream().sorted(Comparator.nullsFirst(Comparator.naturalOrder())).toList()))
            .sorted(Comparator.comparing(Item::pointCode,Comparator.nullsFirst(Comparator.naturalOrder()))).toList();
    }
    public boolean identical(Inspection server, SyncInput input) {
        if (input.items()!=null && input.items().stream().anyMatch(Objects::isNull)) return false;
        return Objects.equals(server.vehicleId,input.vehicleId()) && Objects.equals(server.inspectorName,input.inspectorName())
            && Objects.equals(server.hasKey,input.hasKey()) && Objects.equals(server.status,input.status())
            && canonical(server.items.stream().map(InspectionItem::dto).toList()).equals(canonical(input.items()));
    }
    public void editable(Inspection i) {
        if (!Set.of("DRAFT","RECHECK").contains(i.status)) throw ApiException.error(409,"status","Only DRAFT or RECHECK inspections can be edited");
    }
    public void transition(String from,String to) {
        if (to==null || !STATUSES.contains(to)) throw ApiException.error(400,"to","Unknown target status");
        boolean valid = (from.equals("DRAFT") || from.equals("RECHECK")) && to.equals("SUBMITTED")
            || from.equals("SUBMITTED") && Set.of("APPROVED","RECHECK").contains(to);
        if (!valid) throw ApiException.error(409,"to",from+" cannot move to "+to);
    }
}
